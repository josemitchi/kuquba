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
  { label: "Administra tu propiedad", href: "#propietarios" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Contacto", href: "#contacto" }
] as const;

export const accessOptions = [
  { label: "Portal del propietario", href: "/owner" },
  { label: "Mi estancia", href: "/stay" },
  { label: "Equipo KUQUBA", href: "/ops" }
] as const;

export const trustPillars = [
  "Procesos seguros y transparentes",
  "Atencion personalizada",
  "Propiedades seleccionadas",
  "Gestion profesional"
] as const;

export const portalEntries = [
  {
    key: "guest",
    label: "Mi estancia",
    href: "/stay",
    roleKey: "guest",
    accessMethod: "OTP por correo o telefono",
    mfaRequired: false
  },
  {
    key: "owner",
    label: "Portal del propietario",
    href: "/owner",
    roleKey: "owner",
    accessMethod: "MFA obligatorio",
    mfaRequired: true
  },
  {
    key: "ops",
    label: "Equipo KUQUBA",
    href: "/ops",
    roleKey: "ops_admin",
    accessMethod: "MFA obligatorio y privilegio minimo",
    mfaRequired: true
  }
] as const;

export type PortalAudience = (typeof portalEntries)[number]["key"];

export const permissionKeys = [
  "reservation:self:read",
  "reservation:self:update",
  "property:assigned:read",
  "property:assigned:update",
  "owner:settlement:read",
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
    label: "Huesped",
    permissions: ["reservation:self:read", "reservation:self:update"]
  },
  {
    key: "owner",
    label: "Propietario",
    permissions: ["property:assigned:read", "owner:settlement:read"]
  },
  {
    key: "ops_admin",
    label: "Equipo KUQUBA",
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
  }
] as const;
