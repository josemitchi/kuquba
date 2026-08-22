# Estado del proyecto KUQUBA

Ultima actualizacion: 2026-08-22

## Estado actual

- Monorepo inicial creado con `apps/web`, `apps/api` y `packages/config`.
- Landing publica y portales base disponibles en `/`, `/stay`, `/owner` y `/ops`.
- Experiencia publica de busqueda y seleccion disponible en `/stay/search`.
- Detalle publico de estancia disponible en `/stay/properties/[id]`.
- Solicitudes publicas de propuesta persistidas por `POST /api/public/stay-proposal-requests`.
- API Fastify disponible con healthcheck, bootstrap publico y kernel inicial de identidad.
- Prisma configurado con migraciones versionadas y seed IAM dev.
- PostgreSQL y Redis corren en Docker Compose.
- Web y API dev corren localmente con `npm run dev`, fuera de Docker por ahora.

## Validacion reciente

- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `GET /health`
- `GET /stay/search?destination=Atitlan&guests=6`
- `GET /stay/properties/atitlan-villa-luz`
- `POST /api/public/stay-proposal-requests`

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

## Siguiente incremento recomendado

Construir el enfoque publico de propietarios: evaluacion inicial de propiedad y solicitud de administracion.

Alcance propuesto:

- Crear experiencia `/owner/evaluate` o seccion publica de captacion para propietarios.
- Definir dataset/copy para administracion, operacion, confianza y reporting.
- Agregar formulario de lead de propietario con propiedad, ubicacion, contacto y estado operativo.
- Persistir `OwnerLead` solo con modelo minimo y sin reglas financieras definitivas.
- Mantener separado el portal autenticado `/owner` del flujo publico de captacion.

## Criterios de aceptacion del siguiente incremento

- El flujo publico de propietarios no requiere autenticacion.
- No promete porcentajes, rentabilidad ni condiciones comerciales definitivas.
- La UI conserva consistencia con busqueda de estancias y marca KUQUBA.
- `npm run lint`, `npm run typecheck` y `npm run build` pasan.
