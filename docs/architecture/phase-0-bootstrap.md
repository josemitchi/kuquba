# Fase 0 - Bootstrap

## Alcance

- Monorepo con `apps/web`, `apps/api` y `packages/config`.
- Design tokens KUQUBA compartidos.
- Landing pública inicial basada en las referencias visuales aprobadas.
- API Fastify preparada para módulos del dominio.
- Prisma configurado con un modelo lógico inicial.
- Docker local para PostgreSQL y Redis.

## Criterios de aceptación

- El frontend compila y sirve la landing pública.
- El backend expone `GET /health` y `GET /api/public/bootstrap`.
- TypeScript está en modo estricto.
- No hay datos comerciales presentados como reales.
- No se hard-codean porcentajes financieros ni políticas definitivas.

## Amenazas relevantes desde el inicio

- Exposición prematura de datos sensibles de propiedades.
- Mezcla de datos entre propietario, huésped y operación KUQUBA.
- Reglas financieras hard-coded que impidan contratos variables.
- Dependencias directas del dominio hacia proveedores externos.

## Pendiente antes de migraciones definitivas

- Revisar ERD lógico con el equipo.
- Definir estrategia de tenancy y posible Row Level Security.
- Definir proveedor de autenticación/OTP.
- Definir adapter inicial de pagos sandbox.
