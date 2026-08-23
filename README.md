# KUQUBA

Plataforma de hospitality y administraciÃƒÂ³n profesional de propiedades para Guatemala.

Este repositorio cubre el bootstrap de Fase 0 y el kernel inicial de Fase 1: monorepo, tooling, base visual pÃƒÂºblica, API modular, Prisma, Docker local, identidad inicial y documentaciÃƒÂ³n de arquitectura.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend: Node.js, Fastify, TypeScript.
- Persistencia: PostgreSQL y Prisma.
- Cache/jobs: Redis.
- Arquitectura: modular monolith con lÃƒÂ­mites de dominio explÃƒÂ­citos.

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

- Landing pÃƒÂºblica KUQUBA con navegaciÃƒÂ³n, acceso, buscador y secciones principales.
- Assets oficiales de marca y hero generado para uso local del proyecto.
- API Fastify con healthcheck y endpoint pÃƒÂºblico de bootstrap.
- Kernel inicial de identidad con roles, permisos, requisitos de acceso y passwordless dev.
- Prisma schema con migracion local inicial reproducible.
- Seed IAM dev para roles, permisos y usuarios de prueba.
- Docker Compose para PostgreSQL y Redis.
- Documentos iniciales de fase y modelo lÃƒÂ³gico.

## Estado y siguiente paso

El checkpoint activo del proyecto vive en [docs/project-status.md](docs/project-status.md).

## Rutas locales

- Web publica: `GET /`
- Busqueda publica de estancias: `GET /stay/search`
- Detalle publico de estancia: `GET /stay/properties/[id]`
- Evaluacion publica de propiedad: `GET /owner/evaluate`
- Mi estancia: `GET /stay`
- Portal del propietario: `GET /owner`
- Home autenticado propietario: `GET /owner/home`
- Equipo KUQUBA: `GET /ops`
- Home ops autenticado: `GET /ops/home`
- API healthcheck: `GET /health`
- API bootstrap publico: `GET /api/public/bootstrap`
- API solicitudes de propuesta: `POST /api/public/stay-proposal-requests`
- API leads de propietario: `POST /api/public/owner-leads`
- API portal propietario: `GET /api/owner/portal`
- API bandeja ops: `GET /api/ops/workbench`
- API estados ops: `PATCH /api/ops/workbench/:itemType/:id/status`
- API detalle caso ops: `GET/PATCH /api/ops/workbench/:itemType/:id/case`
- API conversion caso ops: `POST /api/ops/workbench/:itemType/:id/case/convert`
- API gestion conversion ops: `PATCH /api/ops/workbench/:itemType/:id/case/conversion`
- API checklist onboarding ops: `PATCH /api/ops/workbench/:itemType/:id/case/conversion/checklist/:key`
- API versiones propuesta ops: `POST /api/ops/workbench/:itemType/:id/case/conversion/versions`
- API actividad formal ops: `POST /api/ops/workbench/:itemType/:id/case/conversion/activity`
- API solicitud aprobacion formal ops: `POST /api/ops/workbench/:itemType/:id/case/conversion/approval-request`
- API aprobacion formal ops: `POST /api/ops/workbench/:itemType/:id/case/conversion/approve`
- API envio transaccional formal ops: `POST /api/ops/workbench/:itemType/:id/case/conversion/send`
- API notas caso ops: `POST /api/ops/workbench/:itemType/:id/case/notes`
- API tareas caso ops: `POST /api/ops/workbench/:itemType/:id/case/tasks`
- API estado tarea ops: `PATCH /api/ops/workbench/:itemType/:id/case/tasks/:taskId`
- API requisitos de acceso: `GET /api/identity/access-requirements`
- API passwordless dev: `POST /api/identity/passwordless/start`

## Decisiones pendientes

Estas decisiones quedan encapsuladas y no bloquean Fase 0:

- Proveedor de pagos en Guatemala.
- Proveedor WhatsApp/correo transaccional.
- FacturaciÃƒÂ³n/FEL.
- Channel manager/OTA.
- Reglas avanzadas de segmentaciÃƒÂ³n.
- PolÃƒÂ­ticas de cancelaciÃƒÂ³n por propiedad/rate plan.
