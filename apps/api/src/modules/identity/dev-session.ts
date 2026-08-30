import { createHash } from "node:crypto";

import type { PortalAudience } from "@kuquba/config";

import { prisma } from "../../lib/prisma";
import { getRoleKeysForAudience } from "./access-policy";

export type AuthorizedDevPortalSession = {
  audience: PortalAudience;
  expiresAt: Date;
  permissions: string[];
  rawSessionToken: string;
  role: {
    key: string;
    name: string;
  };
  sessionId: string;
  user: {
    displayName: string;
    email: string;
    id: string;
    organizationId: string;
  };
};

export type DevPortalSessionAuthorization =
  | {
      ok: true;
      session: AuthorizedDevPortalSession;
    }
  | {
      ok: false;
      error: "identity_not_allowed_for_audience" | "invalid_or_expired_session" | "missing_permission" | "missing_session";
      statusCode: 401 | 403;
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

export async function authorizeDevPortalSession(input: {
  audience: PortalAudience;
  rawSessionToken?: string;
  requiredPermissions?: string[];
}): Promise<DevPortalSessionAuthorization> {
  if (!input.rawSessionToken) {
    return {
      ok: false,
      error: "missing_session",
      statusCode: 401
    };
  }

  const session = await prisma.devSession.findFirst({
    where: {
      audience: input.audience,
      expiresAt: {
        gt: new Date()
      },
      revokedAt: null,
      sessionTokenHash: hashToken(input.rawSessionToken)
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

  if (!session) {
    return {
      ok: false,
      error: "invalid_or_expired_session",
      statusCode: 401
    };
  }

  await prisma.devSession.update({
    where: {
      id: session.id
    },
    data: {
      lastSeenAt: new Date()
    }
  });

  const userRole = getAudienceRole(session.user.roles, input.audience);

  if (!userRole) {
    return {
      ok: false,
      error: "identity_not_allowed_for_audience",
      statusCode: 403
    };
  }

  const permissions = userRole.role.permissions.map((entry) => entry.permission.key);
  const missingPermissions = (input.requiredPermissions ?? []).filter((permission) => !permissions.includes(permission));

  if (missingPermissions.length > 0) {
    return {
      ok: false,
      error: "missing_permission",
      statusCode: 403
    };
  }

  return {
    ok: true,
    session: {
      audience: input.audience,
      expiresAt: session.expiresAt,
      permissions,
      rawSessionToken: input.rawSessionToken,
      role: {
        key: userRole.role.key,
        name: userRole.role.name
      },
      sessionId: session.id,
      user: {
        displayName: session.user.displayName,
        email: session.user.email,
        id: session.user.id,
        organizationId: session.user.organizationId
      }
    }
  };
}

function getAudienceRole(userRoles: UserRoleWithPermissions[], audience: PortalAudience) {
  const roleKeys = getRoleKeysForAudience(audience);

  for (const roleKey of roleKeys) {
    const userRole = userRoles.find((assignment) => assignment.role.key === roleKey);

    if (userRole) {
      return userRole;
    }
  }

  return undefined;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
