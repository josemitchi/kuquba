import { permissionKeys, opsPortalRoleKeys, portalEntries, roleProfiles, type PortalAudience } from "@kuquba/config";

export function getAccessRequirements() {
  return portalEntries.map((portal) => ({
    audience: portal.key,
    label: portal.label,
    roleKey: portal.roleKey,
    accessMethod: portal.accessMethod,
    mfaRequired: portal.mfaRequired
  }));
}

export function isPortalAudience(value: string): value is PortalAudience {
  return portalEntries.some((entry) => entry.key === value);
}

export function getRoleProfiles() {
  return roleProfiles;
}

export function getPermissionCatalog() {
  return permissionKeys;
}

export function getRoleKeyForAudience(audience: PortalAudience) {
  return portalEntries.find((entry) => entry.key === audience)?.roleKey;
}

export function getRoleKeysForAudience(audience: PortalAudience) {
  const primaryRoleKey = getRoleKeyForAudience(audience);

  if (primaryRoleKey === opsPortalRoleKeys[0]) {
    return [...opsPortalRoleKeys];
  }

  return primaryRoleKey ? [primaryRoleKey] : [];
}
