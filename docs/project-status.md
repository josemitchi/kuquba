# Estado del proyecto KUQUBA

Ultima actualizacion: 2026-08-22

## Estado actual

- Monorepo inicial creado con `apps/web`, `apps/api` y `packages/config`.
- Landing publica y portales base disponibles en `/`, `/stay`, `/owner` y `/ops`.
- Experiencia publica de busqueda y seleccion disponible en `/stay/search`.
- Detalle publico de estancia disponible en `/stay/properties/[id]`.
- Solicitudes publicas de propuesta persistidas por `POST /api/public/stay-proposal-requests`.
- Experiencia publica de captacion de propietarios disponible en `/owner/evaluate`.
- Leads publicos de propietario persistidos por `POST /api/public/owner-leads`.
- Portal autenticado de propietario disponible en `/owner/home` conectado a `GET /api/owner/portal`.
- Datos dev persistidos para owner: propiedades asignadas, contratos, reservas, tareas y documentos.
- API Fastify disponible con healthcheck, bootstrap publico, kernel de identidad y rutas owner protegidas.
- Prisma configurado con migraciones versionadas y seed IAM/dev owner.
- PostgreSQL y Redis corren en Docker Compose.
- Web y API dev corren localmente con `npm run dev`, fuera de Docker por ahora.

## Validacion reciente

- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run prisma:seed`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `GET /health`
- `GET /stay/search?destination=Atitlan&guests=6`
- `GET /stay/properties/atitlan-villa-luz`
- `POST /api/public/stay-proposal-requests`
- `GET /owner/evaluate`
- `POST /api/public/owner-leads`
- `GET /api/owner/portal`
- `GET /owner/home`

## Incremento publico implementado

Se agrego una experiencia de detalle y solicitud de propuesta para estancias, conectada con captura persistida en API.

Alcance entregado:

- Ruta publica `/stay/properties/[id]` con detalle de estancia.
- Galeria, amenidades, condiciones conceptuales y operacion KUQUBA por estancia.
- Formulario cliente de solicitud de propuesta.
- Modelo Prisma `StayProposalRequest` y migracion `20260822000300_stay_proposal_request`.
- Endpoint publico `POST /api/public/stay-proposal-requests` con auditoria sin correo en claro.
- Tarjetas de resultados enlazadas al detalle publico.
- Mensajes que separan solicitud, disponibilidad, tarifa y reserva confirmada.

## Incremento propietario implementado

Se agrego una experiencia autenticada para el propietario, reutilizando la sesion dev verificada contra API y mostrando datos persistidos sin condiciones financieras definitivas.

Alcance entregado:

- Ruta `/owner/home` con portal especifico de propietario.
- Hook compartido `useDevPortalSession` para validar sesion y cerrar sesion dev.
- Modelos Prisma `OwnerTask` y `OwnerDocument` con migracion `20260822000400_owner_portal`.
- Seed dev de propietario, propiedades, unidades, contratos de asignacion, reservas, tareas y documentos.
- Endpoint protegido `GET /api/owner/portal` con sesion owner, permisos y auditoria.
- UI owner conectada a API; no renderiza datos operativos sin sesion owner vigente.
- Copia explicita para no prometer montos, rentabilidad ni reglas financieras definitivas.

## Incremento captacion propietario implementado

Se agrego una experiencia publica para captar propiedades candidatas, separada del portal autenticado de propietario.

Alcance entregado:

- Ruta publica `/owner/evaluate` con formulario de evaluacion inicial.
- Modelo Prisma `OwnerLead` con migracion `20260822000500_owner_lead`.
- Endpoint publico `POST /api/public/owner-leads` con correlacion y auditoria sin contacto en claro.
- CTAs publicos de propietarios enlazados a captacion, no al portal privado.
- Copia explicita para no prometer rentabilidad, contrato ni condiciones comerciales definitivas.

## Siguiente incremento recomendado

Construir una bandeja interna de operaciones para revisar leads de propietarios y solicitudes de propuesta.

Alcance propuesto:

- Crear vista ops autenticada para listar `OwnerLead` y `StayProposalRequest`.
- Permitir marcar estado `REVIEWING`, `CONTACTED` o `CLOSED`.
- Agregar filtros por tipo, estado y fecha de captura.
- Mantener auditoria por cada cambio de estado.
- Conservar separacion entre captacion publica, portal owner y operacion interna.

## Criterios de aceptacion del siguiente incremento

- La bandeja ops requiere sesion interna valida.
- Las listas muestran leads y solicitudes sin exponer datos si no hay sesion ops.
- Los cambios de estado persisten en Prisma y generan auditoria.
- La UI conserva consistencia con portales existentes y permite revision rapida.
- `npm run lint`, `npm run typecheck` y `npm run build` pasan.
