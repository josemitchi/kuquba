# Estado del proyecto KUQUBA

Ultima actualizacion: 2026-08-23

## Estado actual

- Monorepo inicial creado con `apps/web`, `apps/api` y `packages/config`.
- Landing publica y portales base disponibles en `/`, `/stay`, `/owner` y `/ops`.
- Experiencia publica de busqueda y seleccion disponible en `/stay/search`.
- Detalle publico de estancia disponible en `/stay/properties/[id]`.
- Solicitudes publicas de propuesta persistidas por `POST /api/public/stay-proposal-requests`.
- Experiencia publica de captacion de propietarios disponible en `/owner/evaluate`.
- Leads publicos de propietario persistidos por `POST /api/public/owner-leads`.
- Portal autenticado de propietario disponible en `/owner/home` conectado a `GET /api/owner/portal`.
- Bandeja ops autenticada disponible en `/ops/home` conectada a `GET /api/ops/workbench`.
- Cambios de estado ops persistidos por `PATCH /api/ops/workbench/:itemType/:id/status`.
- Expediente ops autenticado disponible por item con `GET/PATCH /api/ops/workbench/:itemType/:id/case`.
- Notas y tareas internas ops persistidas por endpoints protegidos de caso.
- Conversion formal ops disponible por `POST /api/ops/workbench/:itemType/:id/case/convert`.
- Gestion de conversion formal ops disponible por endpoints protegidos para estado, checklist y versiones.
- Asignacion formal ops disponible con responsable, fecha objetivo, notas de entrega, actividad y preview interno de propuesta.
- Aprobacion interna y envio controlado formal disponibles con estados `DRAFT`, `READY_FOR_APPROVAL`, `APPROVED` y `SENT`.
- Delivery formal preparado con adaptador transaccional dev, plantillas versionadas, `providerMessageId`, estado de entrega e historial sin contacto en claro.
- Datos dev persistidos para owner y ops: propiedades, reservas, tareas, documentos, leads y solicitudes.
- API Fastify disponible con healthcheck, bootstrap publico, kernel de identidad, rutas owner y rutas ops protegidas.
- Prisma configurado con migraciones versionadas y seed IAM/dev owner/ops.
- PostgreSQL y Redis corren en Docker Compose.
- Web y API dev corren localmente con `npm run dev`, fuera de Docker por ahora.

## Validacion reciente

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
- `GET /api/ops/workbench`
- `PATCH /api/ops/workbench/:itemType/:id/status`
- `GET /ops/home`
- `PATCH /api/ops/workbench/:itemType/:id/case/conversion`
- `PATCH /api/ops/workbench/:itemType/:id/case/conversion/checklist/:key`
- `POST /api/ops/workbench/:itemType/:id/case/conversion/versions`
- `POST /api/ops/workbench/:itemType/:id/case/conversion/activity`
- `POST /api/ops/workbench/:itemType/:id/case/conversion/approval-request`
- `POST /api/ops/workbench/:itemType/:id/case/conversion/approve`
- `POST /api/ops/workbench/:itemType/:id/case/conversion/send`

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

## Incremento ops implementado

Se agrego una bandeja interna para revisar leads de propietarios y solicitudes de propuesta con cambios de estado persistidos.

Alcance entregado:

- Ruta `/ops/home` conectada a API y protegida por sesion dev ops.
- Endpoint protegido `GET /api/ops/workbench` con metricas, colas y auditoria reciente.
- Endpoint protegido `PATCH /api/ops/workbench/:itemType/:id/status` para cambiar estados `NEW`, `REVIEWING`, `CONTACTED` o `CLOSED`.
- Auditoria por lectura denegada, lectura exitosa y cambios de estado sin guardar contacto en eventos de estado.
- Seed dev de `OwnerLead` y `StayProposalRequest` para bandeja reproducible.

## Incremento detalle ops implementado

Se agrego un expediente interno por lead o solicitud para convertir la bandeja ops en flujo accionable.

Alcance entregado:

- Modelos Prisma `OpsCase`, `OpsCaseNote` y `OpsCaseTask` con migracion `20260822000600_ops_case`.
- Endpoint protegido `GET /api/ops/workbench/:itemType/:id/case` que crea o carga expediente por item.
- Endpoint protegido `PATCH /api/ops/workbench/:itemType/:id/case` para estado, prioridad y siguiente paso.
- Endpoints protegidos para notas y tareas internas de caso.
- Panel lateral en `/ops/home` para abrir expediente, registrar nota, crear tarea y completar/reabrir tarea.
- Auditoria por lectura, actualizacion de expediente, nota creada, tarea creada y tarea actualizada.
- Seed dev de expedientes, notas y tareas para leads/solicitudes demo.

## Incremento conversion formal ops implementado

Se agrego la transicion desde expediente ops hacia flujo formal persistido.

Alcance entregado:

- Modelos Prisma `PropertyOnboarding`, `StayProposal` y `StayProposalVersion` con migracion `20260823000100_case_conversion`.
- Endpoint protegido `POST /api/ops/workbench/:itemType/:id/case/convert`.
- Conversion de `OwnerLead` en checklist de onboarding de propiedad.
- Conversion de `StayProposalRequest` en propuesta formal con version 1.
- Panel ops muestra conversion existente y permite crearla desde el expediente.
- Auditoria por conversion sin guardar datos de contacto dentro del evento.
- Seed dev de onboarding y propuesta versionada para casos demo.

## Incremento gestion flujo formal ops implementado

Se agrego gestion operativa sobre el flujo formal ya convertido, sin enviar comunicaciones reales todavia.

Alcance entregado:

- Endpoint protegido `PATCH /api/ops/workbench/:itemType/:id/case/conversion` para cambiar estado formal y hito de onboarding.
- Endpoint protegido `PATCH /api/ops/workbench/:itemType/:id/case/conversion/checklist/:key` para completar o reabrir items de checklist de onboarding.
- Endpoint protegido `POST /api/ops/workbench/:itemType/:id/case/conversion/versions` para crear nuevas versiones de propuesta.
- Panel ops permite gestionar estados, hito, checklist y versiones desde el expediente.
- Auditoria por cada actualizacion de flujo formal.
- Seed dev vuelve deterministica la propuesta demo y limpia versiones extra al reseed.

## Incremento asignacion formal ops implementado

Se agrego preparacion interna del flujo formal sin enviar comunicaciones reales.

Alcance entregado:

- Modelo Prisma `OpsFormalActivity` y campos `assignedUserId`, `targetDate` y `handoffNotes` en onboarding/propuesta formal.
- Endpoint protegido `POST /api/ops/workbench/:itemType/:id/case/conversion/activity` para registrar actividad formal.
- `PATCH /api/ops/workbench/:itemType/:id/case/conversion` ahora permite asignarse, liberar responsable, guardar fecha objetivo y notas de entrega.
- Panel ops muestra responsable, fecha objetivo, notas de entrega, timeline formal y preview interno de propuesta.
- Seed dev incluye responsable ops, fechas objetivo, notas y actividad formal deterministica.
- Permiso `operation:formal:update` queda asignado a ops admin para edicion del flujo formal.

## Incremento aprobacion formal ops implementado

Se agrego control interno para pasar un flujo formal de borrador a solicitud de aprobacion, aprobacion y envio registrado sin proveedor externo.

Alcance entregado:

- Enum Prisma `FormalApprovalStatus` y campos de aprobacion, envio, responsables y notas de entrega en onboarding/propuesta formal.
- Endpoints protegidos `POST /api/ops/workbench/:itemType/:id/case/conversion/approval-request`, `POST /api/ops/workbench/:itemType/:id/case/conversion/approve` y `POST /api/ops/workbench/:itemType/:id/case/conversion/send`.
- Permiso `operation:formal:approve` asignado a ops admin dev y requerido para aprobar o registrar envio.
- El envio queda bloqueado si no hay aprobacion interna registrada; no ejecuta envio real ni acopla proveedor externo.
- Panel ops muestra estado de aprobacion, notas de entrega, acciones controladas y timeline formal diferenciado.
- Seed dev incluye propuesta lista para aprobacion y actividad demo deterministica.

## Incremento delivery transaccional formal implementado

Se agrego un adaptador transaccional dev para registrar entregas formales desde el flujo aprobado, sin exponer credenciales ni enviar a un proveedor externo real.

Alcance entregado:

- Enum Prisma `FormalDeliveryStatus`, modelo `OpsFormalDelivery` y campos de delivery actual en onboarding/propuesta formal.
- `POST /api/ops/workbench/:itemType/:id/case/conversion/send` ahora usa plantillas versionadas `property_onboarding_owner_v1` y `stay_proposal_guest_v1`.
- El adaptador dev persiste `providerMessageId`, proveedor, canal, plantilla, estado `DELIVERED` y timestamps de envio/entrega.
- Auditoria y delivery guardan hash/mascara del destinatario, no contacto en claro dentro del evento.
- Panel ops muestra estado de entrega, metadata del adaptador e historial de intentos.
- Seed dev limpia intentos de entrega para mantener datos reproducibles.

## Siguiente incremento recomendado

Agregar outbox, reintentos y proveedor externo real para delivery formal.

Alcance propuesto:

- Separar solicitud de envio y ejecucion en una cola/outbox idempotente.
- Configurar proveedor real por entorno con secretos solo en backend.
- Agregar reintentos controlados para estados `FAILED` y errores recuperables.
- Exponer seguimiento de entregado/fallido desde el proveedor sin guardar contacto en claro en auditoria.

## Criterios de aceptacion del siguiente incremento

- Un mismo envio aprobado no se duplica aunque el usuario reintente o la API reciba doble click.
- Los errores recuperables generan reintento auditable y no cambian `approvalStatus` a `SENT` hasta aceptar el proveedor.
- Secretos y payloads completos no salen del backend ni se serializan al frontend.
- `npm run lint`, `npm run typecheck` y `npm run build` pasan.
