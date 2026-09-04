import { createHash, randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { createAuditEventEnvelope } from "../audit/audit-event";
import {
  getAccessRequirements,
  getPermissionCatalog,
  getRoleKeysForAudience,
  getRoleProfiles
} from "./access-policy";
import {
  deliverOtp,
  generateOtpCode,
  hashOtpCode,
  OtpDeliveryError,
  verifyOtpCode
} from "./otp-provider";

const passwordlessStartSchema = z
  .object({
    audience: z.enum(["guest", "owner", "ops"]),
    email: z.string().email().optional(),
    phone: z.string().min(8).max(24).optional()
  })
  .refine((value) => value.email || value.phone, {
    message: "email_or_phone_required"
  });

const passwordlessVerifySchema = z.object({
  audience: z.enum(["guest", "owner", "ops"]),
  challengeId: z.string().uuid(),
  code: z.string().min(4).max(12)
});

const sessionQuerySchema = z.object({
  audience: z.enum(["guest", "owner", "ops"])
});

export const registerIdentityRoutes: FastifyPluginAsync = async (app) => {
  app.get("/access-requirements", async () => ({
    accessRequirements: getAccessRequirements(),
    roles: getRoleProfiles(),
    permissions: getPermissionCatalog()
  }));

  app.post("/passwordless/start", async (request, reply) => {
    const body = passwordlessStartSchema.parse(request.body);
    const destination = body.email ?? body.phone ?? "";
    const destinationHash = hashDestination(destination);
    const channel = body.email ? "email" : "phone";
    const provider = body.email ? "EMAIL_OTP" : "PHONE_OTP";
    const purpose = `login:${body.audience}`;
    const normalizedSubject = normalizeDestination(destination);

    if (env.NODE_ENV === "production" && env.OTP_PROVIDER === "dev") {
      await writeAudit({
        action: "identity.passwordless.start",
        request,
        result: "FAILED",
        reason: "provider_adapter_required",
        nextValue: {
          audience: body.audience,
          channel,
          destinationHash
        }
      });

      return reply.code(501).send({
        error: "provider_adapter_required",
        correlationId: request.id
      });
    }

    if (channel === "phone" && env.OTP_PROVIDER !== "dev") {
      await writeAudit({
        action: "identity.passwordless.start",
        request,
        result: "FAILED",
        reason: "phone_otp_not_configured",
        nextValue: {
          audience: body.audience,
          channel,
          destinationHash
        }
      });

      return reply.code(501).send({
        error: "phone_otp_not_configured",
        correlationId: request.id
      });
    }

    const identity = await prisma.identity.findUnique({
      where: {
        provider_subject: {
          provider,
          subject: normalizedSubject
        }
      },
      select: {
        id: true
      }
    });
    const expiresAt = new Date(Date.now() + env.OTP_CODE_TTL_MINUTES * 60 * 1000);
    const code = env.OTP_PROVIDER === "dev" ? env.DEV_OTP_CODE : generateOtpCode();
    const challenge = await prisma.authChallenge.create({
      data: {
        identityId: identity?.id,
        channel,
        destinationHash,
        purpose,
        expiresAt,
        correlationId: request.id
      },
      select: {
        id: true,
        expiresAt: true
      }
    });
    const codeHash = hashOtpCode({
      challengeId: challenge.id,
      code,
      destinationHash,
      purpose
    });
    let deliveredAt: Date | null = null;
    let deliveryError: string | null = identity ? null : "identity_not_found";
    let deliveryProvider: string = env.OTP_PROVIDER;
    let providerMessageId: string | null = null;

    try {
      if (identity) {
        const delivery = await deliverOtp({
          audience: body.audience,
          challengeId: challenge.id,
          channel,
          code,
          correlationId: request.id,
          destination,
          expiresAt: challenge.expiresAt
        });

        deliveredAt = delivery.sentAt;
        deliveryProvider = delivery.provider;
        providerMessageId = delivery.providerMessageId ?? null;
      }
    } catch (deliveryFailure) {
      const errorCode = deliveryFailure instanceof OtpDeliveryError ? deliveryFailure.code : "otp_delivery_failed";

      await prisma.authChallenge.update({
        data: {
          codeHash,
          deliveryError: errorCode,
          deliveryProvider
        },
        where: {
          id: challenge.id
        }
      });

      request.log.error({ errorCode, deliveryFailure }, "identity.otp.delivery_failed");

      await writeAudit({
        action: "identity.passwordless.start",
        entityId: challenge.id,
        request,
        result: "FAILED",
        reason: errorCode,
        nextValue: {
          audience: body.audience,
          channel,
          destinationHash
        }
      });

      return reply.code(deliveryFailure instanceof OtpDeliveryError ? deliveryFailure.statusCode : 502).send({
        error: errorCode,
        correlationId: request.id
      });
    }

    await prisma.authChallenge.update({
      data: {
        codeHash,
        deliveredAt,
        deliveryError,
        deliveryProvider,
        providerMessageId
      },
      where: {
        id: challenge.id
      }
    });

    const auditEvent = createAuditEventEnvelope({
      action: "identity.passwordless.start",
      entityType: "AuthChallenge",
      entityId: challenge.id,
      nextValue: {
        audience: body.audience,
        channel,
        deliveryProvider,
        destinationHash,
        providerMessageId
      },
      ipAddress: request.ip,
      correlationId: request.id,
      result: "PENDING",
      reason: identity ? (deliveryProvider === "dev_otp_log" ? "dev_otp_ready" : "otp_sent") : "identity_not_found"
    });

    await prisma.auditEvent.create({
      data: {
        action: auditEvent.action,
        entityType: auditEvent.entityType,
        entityId: auditEvent.entityId,
        nextValue: auditEvent.nextValue as Prisma.InputJsonValue,
        ipAddress: auditEvent.ipAddress,
        correlationId: auditEvent.correlationId,
        result: auditEvent.result,
        reason: auditEvent.reason
      }
    });

    request.log.info({ auditEvent }, "audit.event");

    return reply.code(202).send({
      challengeId: challenge.id,
      status: deliveryProvider === "dev_otp_log" ? "dev_code_ready" : "sent",
      delivery: {
        channel,
        destinationMasked: maskDestination(destination)
      },
      expiresAt: challenge.expiresAt.toISOString(),
      correlationId: request.id
    });
  });
  app.post("/passwordless/verify", async (request, reply) => {
    const body = passwordlessVerifySchema.parse(request.body);
    const challenge = await prisma.authChallenge.findUnique({
      where: {
        id: body.challengeId
      },
      include: {
        identity: {
          include: {
            user: {
              include: {
                roles: {
                  include: {
                    role: {
                      include: {
                        permissions: {
                          include: {
                            permission: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!challenge || challenge.purpose !== `login:${body.audience}`) {
      await writeAudit({
        action: "identity.passwordless.verify",
        entityId: body.challengeId,
        request,
        result: "DENIED",
        reason: "challenge_not_found"
      });

      return reply.code(404).send({
        error: "challenge_not_found",
        correlationId: request.id
      });
    }

    if (challenge.consumedAt) {
      await writeAudit({
        action: "identity.passwordless.verify",
        entityId: challenge.id,
        request,
        result: "DENIED",
        reason: "challenge_already_consumed"
      });

      return reply.code(409).send({
        error: "challenge_already_consumed",
        correlationId: request.id
      });
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await writeAudit({
        action: "identity.passwordless.verify",
        entityId: challenge.id,
        request,
        result: "DENIED",
        reason: "challenge_expired"
      });

      return reply.code(410).send({
        error: "challenge_expired",
        correlationId: request.id
      });
    }

    if (challenge.attempts >= 5) {
      await writeAudit({
        action: "identity.passwordless.verify",
        entityId: challenge.id,
        request,
        result: "DENIED",
        reason: "too_many_attempts"
      });

      return reply.code(429).send({
        error: "too_many_attempts",
        correlationId: request.id
      });
    }

    const isValidCode = challenge.codeHash
      ? verifyOtpCode({
          challengeId: challenge.id,
          code: body.code,
          destinationHash: challenge.destinationHash,
          expectedHash: challenge.codeHash,
          purpose: challenge.purpose
        })
      : env.NODE_ENV !== "production" && body.code === env.DEV_OTP_CODE;

    if (!isValidCode) {
      await prisma.authChallenge.update({
        where: {
          id: challenge.id
        },
        data: {
          attempts: {
            increment: 1
          }
        }
      });

      await writeAudit({
        action: "identity.passwordless.verify",
        entityId: challenge.id,
        request,
        result: "DENIED",
        reason: "invalid_code"
      });

      return reply.code(401).send({
        error: "invalid_code",
        correlationId: request.id
      });
    }

    const user = challenge.identity?.user;
    const userRole = user ? getAudienceRole(user.roles, body.audience) : undefined;

    if (!user || !userRole) {
      await writeAudit({
        action: "identity.passwordless.verify",
        entityId: challenge.id,
        request,
        result: "DENIED",
        reason: "identity_not_allowed_for_audience"
      });

      return reply.code(403).send({
        error: "identity_not_allowed_for_audience",
        correlationId: request.id
      });
    }

    const verifiedAt = new Date();

    if (challenge.identity && challenge.identity.status === "PENDING") {
      await prisma.identity.update({
        data: {
          status: "VERIFIED",
          verifiedAt
        },
        where: {
          id: challenge.identity.id
        }
      });
    }

    await prisma.authChallenge.update({
      where: {
        id: challenge.id
      },
      data: {
        consumedAt: verifiedAt,
        attempts: {
          increment: 1
        }
      }
    });

    const permissions = userRole.role.permissions.map((entry) => entry.permission.key);
    const rawSessionToken = `dev_${randomUUID()}_${randomUUID()}`;
    const session = await prisma.devSession.create({
      data: {
        userId: user.id,
        audience: body.audience,
        sessionTokenHash: hashToken(rawSessionToken),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        correlationId: request.id
      },
      select: {
        id: true,
        expiresAt: true
      }
    });

    await writeAudit({
      action: "identity.passwordless.verify",
      entityId: challenge.id,
      request,
      result: "SUCCESS",
      reason: "otp_accepted",
      nextValue: {
        audience: body.audience,
        roleKey: userRole.role.key,
        sessionId: session.id,
        permissionCount: permissions.length
      }
    });

    return reply.send({
      session: buildSessionPayload({
        audience: body.audience,
        expiresAt: session.expiresAt,
        permissions,
        roleKey: userRole.role.key,
        roleName: userRole.role.name,
        sessionId: session.id,
        sessionToken: rawSessionToken,
        userDisplayName: user.displayName,
        userEmail: user.email,
        userId: user.id
      }),
      redirectTo: `/${body.audience === "guest" ? "stay" : body.audience}/home`,
      correlationId: request.id
    });
  });

  app.get("/session", async (request, reply) => {
    const query = sessionQuerySchema.parse(request.query);
    const rawSessionToken = request.headers["x-kuquba-dev-session"]?.toString();

    if (!rawSessionToken) {
      return reply.code(401).send({
        error: "missing_session",
        correlationId: request.id
      });
    }

    const session = await findValidDevSession(rawSessionToken, query.audience);

    if (!session) {
      await writeAudit({
        action: "identity.dev_session.read",
        request,
        result: "DENIED",
        reason: "invalid_or_expired_session"
      });

      return reply.code(401).send({
        error: "invalid_or_expired_session",
        correlationId: request.id
      });
    }

    await prisma.devSession.update({
      where: {
        id: session.id
      },
      data: {
        lastSeenAt: new Date()
      }
    });

    const userRole = getAudienceRole(session.user.roles, query.audience);

    if (!userRole) {
      return reply.code(403).send({
        error: "identity_not_allowed_for_audience",
        correlationId: request.id
      });
    }

    return reply.send({
      session: buildSessionPayload({
        audience: query.audience,
        expiresAt: session.expiresAt,
        permissions: userRole.role.permissions.map((entry) => entry.permission.key),
        roleKey: userRole.role.key,
        roleName: userRole.role.name,
        sessionId: session.id,
        sessionToken: rawSessionToken,
        userDisplayName: session.user.displayName,
        userEmail: session.user.email,
        userId: session.user.id
      }),
      correlationId: request.id
    });
  });

  app.post("/session/logout", async (request, reply) => {
    const rawSessionToken = request.headers["x-kuquba-dev-session"]?.toString();

    if (!rawSessionToken) {
      return reply.code(204).send();
    }

    await prisma.devSession.updateMany({
      where: {
        sessionTokenHash: hashToken(rawSessionToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    await writeAudit({
      action: "identity.dev_session.logout",
      request,
      result: "SUCCESS",
      reason: "dev_session_revoked"
    });

    return reply.code(204).send();
  });
};

type UserRoleWithPermissions = {
  role: {
    key: string;
    name: string;
    permissions: Array<{
      permission: {
        key: string;
      };
    }>;
  };
};

function getAudienceRole(userRoles: UserRoleWithPermissions[], audience: "guest" | "owner" | "ops") {
  const roleKeys = getRoleKeysForAudience(audience);

  for (const roleKey of roleKeys) {
    const userRole = userRoles.find((assignment) => assignment.role.key === roleKey);

    if (userRole) {
      return userRole;
    }
  }

  return undefined;
}

async function findValidDevSession(rawSessionToken: string, audience: "guest" | "owner" | "ops") {
  return prisma.devSession.findFirst({
    where: {
      audience,
      expiresAt: {
        gt: new Date()
      },
      revokedAt: null,
      sessionTokenHash: hashToken(rawSessionToken)
    },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
}

function buildSessionPayload(input: {
  audience: "guest" | "owner" | "ops";
  expiresAt: Date;
  permissions: string[];
  roleKey: string;
  roleName: string;
  sessionId: string;
  sessionToken: string;
  userDisplayName: string;
  userEmail: string;
  userId: string;
}) {
  return {
    audience: input.audience,
    expiresAt: input.expiresAt.toISOString(),
    sessionId: input.sessionId,
    sessionToken: input.sessionToken,
    user: {
      id: input.userId,
      displayName: input.userDisplayName,
      emailMasked: maskDestination(input.userEmail)
    },
    role: {
      key: input.roleKey,
      name: input.roleName
    },
    permissions: input.permissions
  };
}

async function writeAudit(input: {
  action: string;
  entityId?: string;
  request: Pick<FastifyRequest, "id" | "ip">;
  result: "SUCCESS" | "PENDING" | "DENIED" | "FAILED";
  reason: string;
  nextValue?: Prisma.InputJsonValue;
}) {
  const auditEvent = createAuditEventEnvelope({
    action: input.action,
    entityType: "AuthChallenge",
    entityId: input.entityId,
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    result: input.result,
    reason: input.reason,
    nextValue: input.nextValue
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      entityType: auditEvent.entityType,
      entityId: auditEvent.entityId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue | undefined,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });
}

function normalizeDestination(destination: string) {
  return destination.trim().toLowerCase();
}

function hashDestination(destination: string) {
  return createHash("sha256").update(normalizeDestination(destination)).digest("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function maskDestination(destination: string) {
  const trimmed = destination.trim();

  if (trimmed.includes("@")) {
    const [name = "", domain = ""] = trimmed.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }

  return `${trimmed.slice(0, 4)}***${trimmed.slice(-2)}`;
}
