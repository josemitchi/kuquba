export const kuqubaBrand = {
  name: "KUQUBA",
  tagline: "Conexiones que generan confianza",
  colors: {
    midnight: "#0D2233",
    deepGreen: "#14685A",
    terracotta: "#C46A3A",
    warmBeige: "#E6C9A6",
    ivory: "#F7F3EB",
    ink: "#101828",
    line: "#D9E1E7"
  }
} as const;

export const publicNavigation = [
  { label: "Estancias", href: "#estancias" },
  { label: "Propietarios", href: "#propietarios" },
  { label: "Experiencia", href: "#experiencia" },
  { label: "Contacto", href: "/contact" }
] as const;

export const publicCoverageDestinations = ["Lago de Atitlán", "Antigua Guatemala"] as const;

export const publicGuestOptions = [1, 2, 3, 4, 5, 6] as const;

export const accessOptions = [
  { label: "Huéspedes", href: "/stay", description: "Consulta tu reserva" },
  { label: "Propietarios", href: "/owner", description: "Gestiona tu propiedad" },
  { label: "Operaciones", href: "/ops", description: "Equipo KUQUBA" }
] as const;

export const trustPillars = [
  "Procesos seguros y transparentes",
  "Atención personalizada",
  "Propiedades seleccionadas",
  "Gestión profesional"
] as const;

export const portalEntries = [
  {
    key: "guest",
    label: "Huéspedes",
    href: "/stay",
    roleKey: "guest",
    accessMethod: "OTP por correo",
    mfaRequired: false
  },
  {
    key: "owner",
    label: "Propietarios",
    href: "/owner",
    roleKey: "owner",
    accessMethod: "MFA obligatorio",
    mfaRequired: true
  },
  {
    key: "ops",
    label: "Operaciones",
    href: "/ops",
    roleKey: "ops_admin",
    accessMethod: "MFA obligatorio y privilegio mínimo",
    mfaRequired: true
  }
] as const;

export type PortalAudience = (typeof portalEntries)[number]["key"];
export const opsPortalRoleKeys = ['ops_admin', 'iam_admin'] as const;

export const permissionKeys = [
  "reservation:self:read",
  "reservation:self:update",
  "property:assigned:read",
  "property:assigned:update",
  "owner:settlement:read",
  "contract:self:sign",
  "operation:calendar:read",
  "operation:task:update",
  "operation:formal:update",
  "operation:formal:approve",
  "finance:ledger:read",
  "audit:event:read",
  "identity:user:manage"
] as const;

export const roleProfiles = [
  {
    key: "guest",
    label: "Huésped",
    permissions: ["reservation:self:read", "reservation:self:update"]
  },
  {
    key: "owner",
    label: "Propietario",
    permissions: ["property:assigned:read", "owner:settlement:read", "contract:self:sign"]
  },
  {
    key: "ops_admin",
    label: "Operaciones",
    permissions: [
      "property:assigned:read",
      "property:assigned:update",
      "operation:calendar:read",
      "operation:task:update",
      "operation:formal:update",
      "operation:formal:approve",
      "finance:ledger:read",
      "audit:event:read",
      "identity:user:manage"
    ]
  },
  {
    key: 'iam_admin',
    label: 'Administrador IAM',
    permissions: [
      'property:assigned:read',
      'property:assigned:update',
      'operation:calendar:read',
      'operation:task:update',
      'operation:formal:update',
      'operation:formal:approve',
      'finance:ledger:read',
      'audit:event:read',
      'identity:user:manage'
    ]
  }
] as const;
