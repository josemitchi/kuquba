# Fase 1 - Trust & Kernel inicial

## Alcance de este incremento

- Catalogo compartido de portales, roles y permisos base.
- Modelos Prisma conceptuales para identidad, roles, permisos, desafios passwordless y auditoria.
- Endpoint de requisitos de acceso por experiencia autenticada.
- Endpoint `passwordless/start` persistido en PostgreSQL, sin envio real de OTP.
- Pantallas publicas de acceso para Huesped, Propietario y Equipo KUQUBA.
- Migracion SQL inicial y seed de IAM dev.

## Modulos afectados

- `packages/config`: contratos compartidos de marca, portales, roles y permisos.
- `apps/api`: identity, audit event envelope y request context.
- `apps/web`: rutas `/stay`, `/owner`, `/ops`.
- `apps/api/prisma`: modelo logico inicial para IAM.

## Modelo de datos

- `Identity`: proveedor y sujeto verificado o pendiente.
- `Role`, `Permission`, `RolePermission`: catalogo RBAC.
- `UserRole`: asignacion con scope por plataforma, organizacion, propiedad o reserva.
- `AuthChallenge`: desafio passwordless trazable por `correlationId`.
- `AuditEvent`: registro append-only conceptual para acciones sensibles.

## Endpoints

- `GET /api/identity/access-requirements`
- `POST /api/identity/passwordless/start`

El endpoint passwordless retorna `202` y un `challengeId` persistido. No entrega OTP, no autentica y no debe usarse como credencial.

## Seed dev

- `guest.dev@kuquba.local`
- `owner.dev@kuquba.local`
- `ops.dev@kuquba.local`

Estos usuarios son datos ficticios de desarrollo y existen para validar RBAC, identidades y portales.

## Amenazas relevantes

- Enumeracion de correos o telefonos.
- Filtracion de PII en logs.
- Elevacion de privilegios por roles asignados del lado cliente.
- Reutilizacion de desafios vencidos o consumidos.
- Falta de MFA en propietario y equipo operativo.

## Pruebas y verificacion

- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm audit`

## Criterios de aceptacion

- Roles y permisos existen como contratos compartidos.
- API no loguea email o telefono en claro en eventos de auditoria.
- Portales muestran que propietario y ops requieren MFA.
- El build completo sigue pasando.
- No se introducen reglas financieras ni proveedores definitivos.
