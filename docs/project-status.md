# Estado del proyecto KUQUBA

Ultima actualizacion: 2026-08-22

## Estado actual

- Monorepo inicial creado con `apps/web`, `apps/api` y `packages/config`.
- Landing publica y portales base disponibles en `/`, `/stay`, `/owner` y `/ops`.
- Experiencia publica de busqueda y seleccion disponible en `/stay/search`.
- Detalle publico de estancia disponible en `/stay/properties/[id]`.
- Solicitudes publicas de propuesta persistidas por `POST /api/public/stay-proposal-requests`.
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

## Siguiente incremento recomendado

Construir el enfoque publico de captacion para propietarios y persistir leads iniciales sin mezclarlo con el portal autenticado.

Alcance propuesto:

- Crear experiencia `/owner/evaluate` o seccion publica de evaluacion inicial para propietarios.
- Agregar formulario de lead con propiedad, ubicacion, contacto y estado operativo.
- Persistir `OwnerLead` con modelo minimo y auditoria sin datos sensibles innecesarios.
- Mantener separado `/owner` y `/owner/home` del flujo publico de captacion.
- No prometer porcentajes, rentabilidad ni condiciones comerciales definitivas.

## Criterios de aceptacion del siguiente incremento

- El flujo publico de propietarios no requiere autenticacion.
- El formulario valida contacto, ubicacion y estado de propiedad.
- El endpoint publico persiste lead con correlacion y auditoria.
- La UI conserva consistencia con la experiencia publica de estancias y marca KUQUBA.
- `npm run lint`, `npm run typecheck` y `npm run build` pasan.
