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
  getRoleKeyForAudience,
  getRoleProfiles
} from "./access-policy";

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
    const normalizedSubject = normalizeDestination(destination);
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

    const challenge = await prisma.authChallenge.create({
      data: {
        identityId: identity?.id,
        channel,
        destinationHash,
        purpose: `login:${body.audience}`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        correlationId: request.id
      },
      select: {
        id: true,
        expiresAt: true
      }
    });

    const auditEvent = createAuditEventEnvelope({
      action: "identity.passwordless.start",
      entityType: "AuthChallenge",
      entityId: challenge.id,
      nextValue: {
        audience: body.audience,
        channel,
        destinationHash
      },
      ipAddress: request.ip,
      correlationId: request.id,
      result: "PENDING",
      reason: "provider_adapter_pending"
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
      status: "pending_provider_adapter",
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
    const roleKey = getRoleKeyForAudience(body.audience);
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

    if (env.NODE_ENV === "production" || body.code !== env.DEV_OTP_CODE) {
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
        reason: env.NODE_ENV === "production" ? "provider_adapter_required" : "invalid_code"
      });

      return reply.code(401).send({
        error: env.NODE_ENV === "production" ? "provider_adapter_required" : "invalid_code",
        correlationId: request.id
      });
    }

    const user = challenge.identity?.user;
    const userRole = user?.roles.find((assignment) => assignment.role.key === roleKey);

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

    await prisma.authChallenge.update({
      where: {
        id: challenge.id
      },
      data: {
        consumedAt: new Date(),
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
      reason: "dev_otp_accepted",
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
  const roleKey = getRoleKeyForAudience(audience);

  return userRoles.find((assignment) => assignment.role.key === roleKey);
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
