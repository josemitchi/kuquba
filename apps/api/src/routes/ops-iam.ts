import { opsPortalRoleKeys } from "@kuquba/config";
import type { Prisma } from "@prisma/client";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { createAuditEventEnvelope } from "../modules/audit/audit-event";
import {
  authorizeDevPortalSession,
  type AuthorizedDevPortalSession
} from "../modules/identity/dev-session";

const iamManagePermissions = ["identity:user:manage"];
const roleScopeSchema = z.enum(["PLATFORM", "ORGANIZATION", "PROPERTY", "RESERVATION"]);
const userParamsSchema = z.object({
  userId: z.string().uuid()
});
const userRoleParamsSchema = z.object({
  assignmentId: z.string().uuid()
});
const roleParamsSchema = z.object({
  roleId: z.string().uuid()
});
const rolePermissionParamsSchema = z.object({
  permissionId: z.string().uuid(),
  roleId: z.string().uuid()
});
const keySchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9_:.-]+$/);
const assignUserRoleSchema = z
  .object({
    resourceId: z.string().trim().min(1).max(160).nullable().optional(),
    roleId: z.string().uuid().optional(),
    roleKey: keySchema.optional(),
    scope: roleScopeSchema.default("ORGANIZATION")
  })
  .refine((value) => value.roleId || value.roleKey, {
    message: "role_required"
  });
const grantRolePermissionSchema = z
  .object({
    permissionId: z.string().uuid().optional(),
    permissionKey: keySchema.optional()
  })
  .refine((value) => value.permissionId || value.permissionKey, {
    message: "permission_required"
  });

export const registerOpsIamRoutes: FastifyPluginAsync = async (app) => {
  app.get("/iam", async (request, reply) => {
    const authorization = await authorizeOpsIamRequest({
      action: "ops.iam.read",
      request
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const iam = await loadOpsIamDashboard();

    await writeIamAudit({
      action: "ops.iam.read",
      actorUserId: authorization.session.user.id,
      entityType: "IamDashboard",
      nextValue: {
        permissionCount: iam.permissions.length,
        roleCount: iam.roles.length,
        userCount: iam.users.length
      },
      reason: "ops_iam_loaded",
      request,
      result: "SUCCESS"
    });

    return reply.send({
      iam,
      correlationId: request.id
    });
  });

  app.post("/iam/users/:userId/roles", async (request, reply) => {
    const authorization = await authorizeOpsIamRequest({
      action: "ops.iam.user_role.assign",
      request
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = userParamsSchema.parse(request.params);
    const body = assignUserRoleSchema.parse(request.body);
    const result = await assignUserRole({
      actor: authorization.session,
      body,
      request,
      userId: params.userId
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        error: result.error,
        correlationId: request.id
      });
    }

    return reply.code(result.statusCode).send({
      iam: result.iam,
      assignment: result.assignment,
      correlationId: request.id
    });
  });

  app.delete("/iam/user-roles/:assignmentId", async (request, reply) => {
    const authorization = await authorizeOpsIamRequest({
      action: "ops.iam.user_role.revoke",
      request
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = userRoleParamsSchema.parse(request.params);
    const result = await revokeUserRole({
      actor: authorization.session,
      assignmentId: params.assignmentId,
      request
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        error: result.error,
        correlationId: request.id
      });
    }

    return reply.send({
      iam: result.iam,
      correlationId: request.id
    });
  });

  app.post("/iam/roles/:roleId/permissions", async (request, reply) => {
    const authorization = await authorizeOpsIamRequest({
      action: "ops.iam.role_permission.grant",
      request
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = roleParamsSchema.parse(request.params);
    const body = grantRolePermissionSchema.parse(request.body);
    const result = await grantRolePermission({
      actor: authorization.session,
      body,
      request,
      roleId: params.roleId
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        error: result.error,
        correlationId: request.id
      });
    }

    return reply.code(result.statusCode).send({
      iam: result.iam,
      correlationId: request.id
    });
  });

  app.delete("/iam/roles/:roleId/permissions/:permissionId", async (request, reply) => {
    const authorization = await authorizeOpsIamRequest({
      action: "ops.iam.role_permission.revoke",
      request
    });

    if (!authorization.ok) {
      return reply.code(authorization.statusCode).send({
        error: authorization.error,
        correlationId: request.id
      });
    }

    const params = rolePermissionParamsSchema.parse(request.params);
    const result = await revokeRolePermission({
      actor: authorization.session,
      permissionId: params.permissionId,
      request,
      roleId: params.roleId
    });

    if (!result.ok) {
      return reply.code(result.statusCode).send({
        error: result.error,
        correlationId: request.id
      });
    }

    return reply.send({
      iam: result.iam,
      correlationId: request.id
    });
  });
};

type AssignUserRoleBody = z.infer<typeof assignUserRoleSchema>;
type GrantRolePermissionBody = z.infer<typeof grantRolePermissionSchema>;
type RoleScopeValue = z.infer<typeof roleScopeSchema>;
type IamRoleRecord = Prisma.RoleGetPayload<{ include: { permissions: { include: { permission: true } } } }>;
type IamUserRecord = Prisma.UserGetPayload<{ include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } }>; 


async function authorizeOpsIamRequest(input: {
  action: string;
  request: Pick<FastifyRequest, "headers" | "id" | "ip" | "log">;
}) {
  const rawSessionToken = input.request.headers["x-kuquba-dev-session"]?.toString();
  const authorization = await authorizeDevPortalSession({
    audience: "ops",
    rawSessionToken,
    requiredPermissions: iamManagePermissions
  });

  if (!authorization.ok) {
    await writeIamAudit({
      action: input.action,
      entityType: "IamDashboard",
      nextValue: {
        requiredPermissions: iamManagePermissions
      },
      reason: authorization.error,
      request: input.request,
      result: "DENIED"
    });
  }

  return authorization;
}

async function assignUserRole(input: {
  actor: AuthorizedDevPortalSession;
  body: AssignUserRoleBody;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  userId: string;
}) {
  const [targetUser, role] = await Promise.all([
    prisma.user.findUnique({
      select: {
        displayName: true,
        id: true,
        organizationId: true
      },
      where: {
        id: input.userId
      }
    }),
    findRole(input.body)
  ]);

  if (!targetUser || !role) {
    await writeIamAudit({
      action: "ops.iam.user_role.assign",
      actorUserId: input.actor.user.id,
      entityId: input.userId,
      entityType: "UserRole",
      nextValue: {
        roleId: input.body.roleId ?? null,
        roleKey: input.body.roleKey ?? null,
        targetUserId: input.userId
      },
      reason: targetUser ? "role_not_found" : "user_not_found",
      request: input.request,
      result: "DENIED"
    });

    return {
      ok: false as const,
      statusCode: 404 as const,
      error: targetUser ? "role_not_found" : "user_not_found"
    };
  }

  const scopedResource = resolveScopedResource({
    actorOrganizationId: input.actor.user.organizationId,
    resourceId: input.body.resourceId,
    scope: input.body.scope
  });

  if (!scopedResource.ok) {
    await writeIamAudit({
      action: "ops.iam.user_role.assign",
      actorUserId: input.actor.user.id,
      entityId: input.userId,
      entityType: "UserRole",
      nextValue: {
        roleKey: role.key,
        scope: input.body.scope
      },
      reason: scopedResource.error,
      request: input.request,
      result: "DENIED"
    });

    return {
      ok: false as const,
      statusCode: 422 as const,
      error: scopedResource.error
    };
  }

  const previous = await prisma.userRole.findFirst({
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
    },
    where: {
      resourceId: scopedResource.resourceId,
      roleId: role.id,
      scope: input.body.scope,
      userId: targetUser.id
    }
  });

  const assignment =
    previous ??
    (await prisma.userRole.create({
      data: {
        assignedByUserId: input.actor.user.id,
        resourceId: scopedResource.resourceId,
        roleId: role.id,
        scope: input.body.scope,
        userId: targetUser.id
      },
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
    }));

  await writeIamAudit({
    action: "ops.iam.user_role.assign",
    actorUserId: input.actor.user.id,
    entityId: assignment.id,
    entityType: "UserRole",
    nextValue: buildUserRoleAuditValue({
      assignmentId: assignment.id,
      resourceId: scopedResource.resourceId,
      roleId: role.id,
      roleKey: role.key,
      scope: input.body.scope,
      targetUserId: targetUser.id
    }),
    previousValue: previous
      ? buildUserRoleAuditValue({
          assignmentId: previous.id,
          resourceId: previous.resourceId,
          roleId: previous.roleId,
          roleKey: role.key,
          scope: previous.scope,
          targetUserId: previous.userId
        })
      : undefined,
    reason: previous ? "user_role_assignment_exists" : "user_role_assigned",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    ok: true as const,
    statusCode: previous ? (200 as const) : (201 as const),
    assignment: buildUserRoleAssignment(assignment),
    iam: await loadOpsIamDashboard()
  };
}

async function revokeUserRole(input: {
  actor: AuthorizedDevPortalSession;
  assignmentId: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
}) {
  const assignment = await prisma.userRole.findUnique({
    include: {
      role: true
    },
    where: {
      id: input.assignmentId
    }
  });

  if (!assignment) {
    await writeIamAudit({
      action: "ops.iam.user_role.revoke",
      actorUserId: input.actor.user.id,
      entityId: input.assignmentId,
      entityType: "UserRole",
      reason: "user_role_assignment_not_found",
      request: input.request,
      result: "DENIED"
    });

    return {
      ok: false as const,
      statusCode: 404 as const,
      error: "user_role_assignment_not_found"
    };
  }

  if (await wouldRemoveActorLastOpsRole(input.actor, assignment)) {
    await writeIamAudit({
      action: "ops.iam.user_role.revoke",
      actorUserId: input.actor.user.id,
      entityId: assignment.id,
      entityType: "UserRole",
      nextValue: {
        roleKey: assignment.role.key,
        targetUserId: assignment.userId
      },
      reason: "last_ops_admin_role_required",
      request: input.request,
      result: "DENIED"
    });

    return {
      ok: false as const,
      statusCode: 409 as const,
      error: "last_ops_admin_role_required"
    };
  }

  await prisma.userRole.delete({
    where: {
      id: assignment.id
    }
  });

  await writeIamAudit({
    action: "ops.iam.user_role.revoke",
    actorUserId: input.actor.user.id,
    entityId: assignment.id,
    entityType: "UserRole",
    previousValue: buildUserRoleAuditValue({
      assignmentId: assignment.id,
      resourceId: assignment.resourceId,
      roleId: assignment.roleId,
      roleKey: assignment.role.key,
      scope: assignment.scope,
      targetUserId: assignment.userId
    }),
    reason: "user_role_revoked",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    ok: true as const,
    iam: await loadOpsIamDashboard()
  };
}

async function grantRolePermission(input: {
  actor: AuthorizedDevPortalSession;
  body: GrantRolePermissionBody;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  roleId: string;
}) {
  const [role, permission] = await Promise.all([
    prisma.role.findUnique({
      where: {
        id: input.roleId
      }
    }),
    findPermission(input.body)
  ]);

  if (!role || !permission) {
    await writeIamAudit({
      action: "ops.iam.role_permission.grant",
      actorUserId: input.actor.user.id,
      entityId: input.roleId,
      entityType: "RolePermission",
      nextValue: {
        permissionId: input.body.permissionId ?? null,
        permissionKey: input.body.permissionKey ?? null,
        roleId: input.roleId
      },
      reason: role ? "permission_not_found" : "role_not_found",
      request: input.request,
      result: "DENIED"
    });

    return {
      ok: false as const,
      statusCode: 404 as const,
      error: role ? "permission_not_found" : "role_not_found"
    };
  }

  const previous = await prisma.rolePermission.findUnique({
    where: {
      roleId_permissionId: {
        permissionId: permission.id,
        roleId: role.id
      }
    }
  });

  if (!previous) {
    await prisma.rolePermission.create({
      data: {
        permissionId: permission.id,
        roleId: role.id
      }
    });
  }

  await writeIamAudit({
    action: "ops.iam.role_permission.grant",
    actorUserId: input.actor.user.id,
    entityId: buildRolePermissionEntityId(role.id, permission.id),
    entityType: "RolePermission",
    nextValue: buildRolePermissionAuditValue(role, permission),
    previousValue: previous ? buildRolePermissionAuditValue(role, permission) : undefined,
    reason: previous ? "role_permission_exists" : "role_permission_granted",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    ok: true as const,
    statusCode: previous ? (200 as const) : (201 as const),
    iam: await loadOpsIamDashboard()
  };
}

async function revokeRolePermission(input: {
  actor: AuthorizedDevPortalSession;
  permissionId: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  roleId: string;
}) {
  const rolePermission = await prisma.rolePermission.findUnique({
    include: {
      permission: true,
      role: true
    },
    where: {
      roleId_permissionId: {
        permissionId: input.permissionId,
        roleId: input.roleId
      }
    }
  });

  if (!rolePermission) {
    await writeIamAudit({
      action: "ops.iam.role_permission.revoke",
      actorUserId: input.actor.user.id,
      entityId: buildRolePermissionEntityId(input.roleId, input.permissionId),
      entityType: "RolePermission",
      reason: "role_permission_not_found",
      request: input.request,
      result: "DENIED"
    });

    return {
      ok: false as const,
      statusCode: 404 as const,
      error: "role_permission_not_found"
    };
  }

  if (await wouldRemoveActorLastIamPermission(input.actor, rolePermission.roleId, rolePermission.permission.key)) {
    await writeIamAudit({
      action: "ops.iam.role_permission.revoke",
      actorUserId: input.actor.user.id,
      entityId: buildRolePermissionEntityId(rolePermission.roleId, rolePermission.permissionId),
      entityType: "RolePermission",
      nextValue: buildRolePermissionAuditValue(rolePermission.role, rolePermission.permission),
      reason: "last_identity_manage_permission_required",
      request: input.request,
      result: "DENIED"
    });

    return {
      ok: false as const,
      statusCode: 409 as const,
      error: "last_identity_manage_permission_required"
    };
  }

  await prisma.rolePermission.delete({
    where: {
      roleId_permissionId: {
        permissionId: rolePermission.permissionId,
        roleId: rolePermission.roleId
      }
    }
  });

  await writeIamAudit({
    action: "ops.iam.role_permission.revoke",
    actorUserId: input.actor.user.id,
    entityId: buildRolePermissionEntityId(rolePermission.roleId, rolePermission.permissionId),
    entityType: "RolePermission",
    previousValue: buildRolePermissionAuditValue(rolePermission.role, rolePermission.permission),
    reason: "role_permission_revoked",
    request: input.request,
    result: "SUCCESS"
  });

  return {
    ok: true as const,
    iam: await loadOpsIamDashboard()
  };
}

async function loadOpsIamDashboard() {
  const [users, roles, permissions, recentAuditEvents] = await Promise.all([
    prisma.user.findMany({
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
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: {
        key: "asc"
      }
    }),
    prisma.permission.findMany({
      orderBy: {
        key: "asc"
      }
    }),
    prisma.auditEvent.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        action: true,
        createdAt: true,
        entityId: true,
        entityType: true,
        id: true,
        reason: true,
        result: true
      },
      take: 12,
      where: {
        entityType: {
          in: ["IamDashboard", "UserRole", "RolePermission"]
        }
      }
    })
  ]);

  const assignmentCount = users.reduce((count, user) => count + user.roles.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        hint: `${assignmentCount} asignacion(es) activas`,
        label: "Usuarios IAM",
        value: `${users.length}`
      },
      {
        hint: `${permissions.length} permiso(s) catalogados`,
        label: "Roles",
        value: `${roles.length}`
      },
      {
        hint: "Permite cambios IAM",
        label: "Rol admin",
        value: roles.some((role) => role.key === "iam_admin") ? "Activo" : "Falta"
      }
    ],
    permissions: permissions.map(buildPermissionItem),
    recentAuditEvents: recentAuditEvents.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString()
    })),
    roleScopes: roleScopeSchema.options,
    roles: roles.map(buildRoleItem),
    users: users.map(buildUserItem)
  };
}

function buildUserItem(user: IamUserRecord) {
  return {
    createdAt: user.createdAt.toISOString(),
    displayName: user.displayName,
    emailMasked: maskEmail(user.email),
    id: user.id,
    organizationId: user.organizationId,
    roles: user.roles.map(buildUserRoleAssignment)
  };
}

function buildRoleItem(role: IamRoleRecord) {
  return {
    createdAt: role.createdAt.toISOString(),
    description: role.description,
    id: role.id,
    key: role.key,
    name: role.name,
    permissions: role.permissions.map((entry) => buildPermissionItem(entry.permission)).sort(sortByKey)
  };
}

function buildPermissionItem(permission: { createdAt?: Date; description: string | null; id: string; key: string }) {
  return {
    description: permission.description,
    id: permission.id,
    key: permission.key
  };
}

function buildUserRoleAssignment(assignment: {
  assignedByUserId: string | null;
  createdAt: Date;
  id: string;
  resourceId: string | null;
  role: {
    id: string;
    key: string;
    name: string;
    permissions: Array<{
      permission: {
        key: string;
      };
    }>;
  };
  roleId: string;
  scope: string;
  userId: string;
}) {
  return {
    assignedByUserId: assignment.assignedByUserId,
    assignmentId: assignment.id,
    createdAt: assignment.createdAt.toISOString(),
    permissions: assignment.role.permissions.map((entry) => entry.permission.key).sort(),
    resourceId: assignment.resourceId,
    roleId: assignment.roleId,
    roleKey: assignment.role.key,
    roleName: assignment.role.name,
    scope: assignment.scope,
    userId: assignment.userId
  };
}

async function findRole(input: Pick<AssignUserRoleBody, 'roleId' | 'roleKey'>) {
  if (input.roleId) {
    return prisma.role.findUnique({
      where: {
        id: input.roleId
      }
    });
  }

  return prisma.role.findUnique({
    where: {
      key: input.roleKey!
    }
  });
}

async function findPermission(input: Pick<GrantRolePermissionBody, 'permissionId' | 'permissionKey'>) {
  if (input.permissionId) {
    return prisma.permission.findUnique({
      where: {
        id: input.permissionId
      }
    });
  }

  return prisma.permission.findUnique({
    where: {
      key: input.permissionKey!
    }
  });
}

function resolveScopedResource(input: {
  actorOrganizationId: string;
  resourceId?: string | null;
  scope: RoleScopeValue;
}) {
  const resourceId = input.resourceId?.trim() || null;

  if (input.scope === "PLATFORM") {
    return {
      ok: true as const,
      resourceId: null
    };
  }

  if (input.scope === "ORGANIZATION") {
    return {
      ok: true as const,
      resourceId: resourceId ?? input.actorOrganizationId
    };
  }

  if (!resourceId) {
    return {
      ok: false as const,
      error: "resource_id_required_for_scope"
    };
  }

  return {
    ok: true as const,
    resourceId
  };
}

async function wouldRemoveActorLastOpsRole(
  actor: AuthorizedDevPortalSession,
  assignment: { id: string; role: { key: string }; userId: string }
) {
  if (assignment.userId !== actor.user.id || !(opsPortalRoleKeys as readonly string[]).includes(assignment.role.key)) {
    return false;
  }

  const remainingOpsRoleCount = await prisma.userRole.count({
    where: {
      id: {
        not: assignment.id
      },
      role: {
        key: {
          in: [...opsPortalRoleKeys]
        }
      },
      userId: actor.user.id
    }
  });

  return remainingOpsRoleCount === 0;
}

async function wouldRemoveActorLastIamPermission(
  actor: AuthorizedDevPortalSession,
  roleId: string,
  permissionKey: string
) {
  if (permissionKey !== "identity:user:manage") {
    return false;
  }

  const actorHasTargetRole = await prisma.userRole.count({
    where: {
      roleId,
      userId: actor.user.id
    }
  });

  if (actorHasTargetRole === 0) {
    return false;
  }

  const otherIamRoleCount = await prisma.userRole.count({
    where: {
      role: {
        permissions: {
          some: {
            permission: {
              key: "identity:user:manage"
            }
          }
        }
      },
      roleId: {
        not: roleId
      },
      userId: actor.user.id
    }
  });

  return otherIamRoleCount === 0;
}

function buildUserRoleAuditValue(input: {
  assignmentId: string;
  resourceId: string | null;
  roleId: string;
  roleKey: string;
  scope: string;
  targetUserId: string;
}) {
  return {
    assignmentId: input.assignmentId,
    resourceId: input.resourceId,
    roleId: input.roleId,
    roleKey: input.roleKey,
    scope: input.scope,
    targetUserId: input.targetUserId
  };
}

function buildRolePermissionAuditValue(
  role: { id: string; key: string },
  permission: { id: string; key: string }
) {
  return {
    permissionId: permission.id,
    permissionKey: permission.key,
    roleId: role.id,
    roleKey: role.key
  };
}

function buildRolePermissionEntityId(roleId: string, permissionId: string) {
  return `${roleId}:${permissionId}`;
}

function sortByKey(left: { key: string }, right: { key: string }) {
  return left.key.localeCompare(right.key);
}

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");

  return `${name.slice(0, 2)}***@${domain}`;
}

async function writeIamAudit(input: {
  action: string;
  actorUserId?: string;
  entityId?: string;
  entityType: string;
  nextValue?: Prisma.InputJsonValue;
  previousValue?: Prisma.InputJsonValue;
  reason: string;
  request: Pick<FastifyRequest, "id" | "ip" | "log">;
  result: "SUCCESS" | "PENDING" | "DENIED" | "FAILED";
}) {
  const auditEvent = createAuditEventEnvelope({
    action: input.action,
    actorUserId: input.actorUserId,
    entityId: input.entityId,
    entityType: input.entityType,
    ipAddress: input.request.ip,
    correlationId: input.request.id,
    nextValue: input.nextValue,
    previousValue: input.previousValue,
    result: input.result,
    reason: input.reason
  });

  await prisma.auditEvent.create({
    data: {
      action: auditEvent.action,
      actorUserId: auditEvent.actorUserId,
      entityId: auditEvent.entityId,
      entityType: auditEvent.entityType,
      ipAddress: auditEvent.ipAddress,
      correlationId: auditEvent.correlationId,
      nextValue: auditEvent.nextValue as Prisma.InputJsonValue | undefined,
      previousValue: auditEvent.previousValue as Prisma.InputJsonValue | undefined,
      result: auditEvent.result,
      reason: auditEvent.reason
    }
  });

  input.request.log.info({ auditEvent }, "audit.event");
}
