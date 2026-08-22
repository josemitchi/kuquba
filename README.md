# KUQUBA

Plataforma de hospitality y administración profesional de propiedades para Guatemala.

Este repositorio cubre el bootstrap de Fase 0 y el kernel inicial de Fase 1: monorepo, tooling, base visual pública, API modular, Prisma, Docker local, identidad inicial y documentación de arquitectura.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend: Node.js, Fastify, TypeScript.
- Persistencia: PostgreSQL y Prisma.
- Cache/jobs: Redis.
- Arquitectura: modular monolith con límites de dominio explícitos.

## Primer arranque

```bash
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
docker compose up -d
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Frontend: http://localhost:3000  
API: http://localhost:4000/health
PostgreSQL local: `127.0.0.1:55432`

PostgreSQL se publica en `55432` para evitar colisiones con instalaciones locales que ya usen `5432`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run format
```

## Alcance actual

- Landing pública KUQUBA con navegación, acceso, buscador y secciones principales.
- Assets oficiales de marca y hero generado para uso local del proyecto.
- API Fastify con healthcheck y endpoint público de bootstrap.
- Kernel inicial de identidad con roles, permisos, requisitos de acceso y passwordless dev.
- Prisma schema con migracion local inicial reproducible.
- Seed IAM dev para roles, permisos y usuarios de prueba.
- Docker Compose para PostgreSQL y Redis.
- Documentos iniciales de fase y modelo lógico.

## Estado y siguiente paso

El checkpoint activo del proyecto vive en [docs/project-status.md](docs/project-status.md).

## Rutas locales

- Web publica: `GET /`
- Busqueda publica de estancias: `GET /stay/search`
- Mi estancia: `GET /stay`
- Portal del propietario: `GET /owner`
- Equipo KUQUBA: `GET /ops`
- API healthcheck: `GET /health`
- API bootstrap publico: `GET /api/public/bootstrap`
- API requisitos de acceso: `GET /api/identity/access-requirements`
- API passwordless dev: `POST /api/identity/passwordless/start`

## Decisiones pendientes

Estas decisiones quedan encapsuladas y no bloquean Fase 0:

- Proveedor de pagos en Guatemala.
- Proveedor WhatsApp/correo transaccional.
- Facturación/FEL.
- Channel manager/OTA.
- Reglas avanzadas de segmentación.
- Políticas de cancelación por propiedad/rate plan.
