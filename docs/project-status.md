# Estado del proyecto KUQUBA

Ultima actualizacion: 2026-08-29

## Estado actual

- Monorepo inicial creado con `apps/web`, `apps/api` y `packages/config`.
- Landing publica y portales base disponibles en `/`, `/stay`, `/owner` y `/ops`.
- Experiencia publica de busqueda y seleccion disponible en `/stay/search`.
- Detalle publico de estancia disponible en `/stay/properties/[id]` con reserva directa desde cotizacion y pago dev.
- Cotizacion publica inicial de disponibilidad y tarifa persistida por `POST /api/public/stay-quotes`.
- Reserva directa publica: desde una cotizacion disponible la UI captura datos, crea bloqueo temporal interno y abre checkout dev.
- Endpoint legacy de solicitudes de propuesta disponible para datos/casos existentes; no se expone en el flujo publico actual del huesped.
- Experiencia publica de captacion de propietarios disponible en `/owner/evaluate`.
- Leads publicos de propietario persistidos por `POST /api/public/owner-leads`.
- Portal autenticado de huesped disponible en `/stay/home` conectado a `GET /api/guest/portal`.
- Portal autenticado de propietario disponible en `/owner/home` conectado a `GET /api/owner/portal`.
- Contratos owner versionados disponibles desde onboarding aprobado y portal propietario.
- Firma/aceptacion dev de contrato disponible por `POST /api/owner/contracts/:contractId/accept-dev`.
- Finanzas owner dev disponibles en `/owner/home` desde `OwnerSettlement`, `OwnerSettlementLine` y `LedgerEntry`.
- Bandeja ops autenticada disponible en `/ops/home` conectada a `GET /api/ops/workbench`.
- Gestion IAM Ops disponible en `/ops/home` conectada a `GET /api/ops/iam` y mutaciones auditadas de roles/permisos.
- Cambios de estado ops persistidos por `PATCH /api/ops/workbench/:itemType/:id/status`.
- Expediente ops autenticado disponible por item con `GET/PATCH /api/ops/workbench/:itemType/:id/case`.
- Notas y tareas internas ops persistidas por endpoints protegidos de caso.
- Conversion formal ops disponible por `POST /api/ops/workbench/:itemType/:id/case/convert`.
- Gestion de conversion formal ops disponible por endpoints protegidos para estado, checklist y versiones.
- Asignacion formal ops disponible con responsable, fecha objetivo, notas de entrega, actividad y preview interno de propuesta.
- Aprobacion interna y envio controlado formal disponibles con estados `DRAFT`, `READY_FOR_APPROVAL`, `APPROVED` y `SENT`.
- Delivery formal preparado con adaptador transaccional dev, plantillas versionadas, `providerMessageId`, estado de entrega e historial sin contacto en claro.
- Contrato webhook generico de delivery formal documentado y representado en backend, con transporte externo desactivado/fail-closed hasta aprobar proveedor y destino.
- Datos dev persistidos para guest, owner y ops: propiedades, reservas, cotizaciones, pagos dev, tareas, documentos, leads y solicitudes.
- API Fastify disponible con healthcheck, bootstrap publico, kernel de identidad, rutas guest, owner y ops protegidas.
- Prisma configurado con migraciones versionadas y seed IAM/dev guest/owner/ops/iam-admin.
- PostgreSQL y Redis corren en Docker Compose.
- Web y API dev corren localmente con `npm run dev`, fuera de Docker por ahora.
- Inventario funcional por audiencia disponible en [docs/functionality-inventory.md](functionality-inventory.md).

## Validacion reciente

- `npm run prisma:seed`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `GET /health`
- `GET /stay/search?destination=Atitlan&guests=6`
- `GET /stay/properties/atitlan-villa-luz`
- `POST /api/public/stay-quotes`\n- `POST /api/public/stay-holds`\n- `POST /api/public/payment-checkouts`\n- `POST /api/public/payment-checkouts/confirm`
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

## Bitacora cierre MVP

Se agrego la bitacora de cierre MVP en [docs/mvp-completion-log.md](mvp-completion-log.md) con 7 puntos priorizados. El primer corte en desarrollo es el modulo Ops de reservas y disponibilidad.

## Incremento reserva directa publica implementado

Se cambio el detalle publico de estancia para que el huesped no envie una solicitud de propuesta. El flujo visible ahora es cotizacion -> datos de pago -> checkout dev -> reserva confirmada.

Alcance entregado:

- Se retiro el formulario publico de solicitud del detalle de estancia.
- `StayQuotePanel` crea el bloqueo temporal interno y abre checkout dev desde una sola accion de pago.
- Busqueda y detalle usan copys de reserva directa, disponibilidad protegida durante checkout y confirmacion por pago.
- `bookingNote` reemplaza el texto publico orientado a propuesta en el inventario de estancias.

## Incremento publico implementado

Se agrego una experiencia de detalle para estancias. El formulario publico de solicitud quedo reemplazado por reserva directa dev desde cotizacion y pago.

Alcance entregado:

- Ruta publica `/stay/properties/[id]` con detalle de estancia.
- Galeria, amenidades, condiciones conceptuales y operacion KUQUBA por estancia.
- Panel cliente de cotizacion, datos para pago y reserva directa dev.
- Modelo Prisma `StayProposalRequest` y migracion `20260822000300_stay_proposal_request`.
- Endpoint publico legacy `POST /api/public/stay-proposal-requests` con auditoria sin correo en claro, no renderizado en el flujo actual del huesped.
- Tarjetas de resultados enlazadas al detalle publico.
- Mensajes que separan cotizacion, bloqueo temporal, checkout dev y reserva confirmada.

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

## Incremento outbox delivery formal implementado

Se agrego outbox idempotente y reintentos controlados para delivery formal. El proveedor externo queda preparado a nivel de configuracion, pero no habilitado en este entorno hasta aprobar un destino/proveedor concreto que pueda recibir datos transaccionales.

Alcance entregado:

- `OpsFormalDelivery` ahora actua como outbox con `idempotencyKey` unico, `attemptCount`, `maxAttempts`, `lastAttemptAt`, `nextAttemptAt` y `acceptedAt`.
- `POST /api/ops/workbench/:itemType/:id/case/conversion/send` crea/reserva la solicitud antes de ejecutar el adaptador, evitando doble ejecucion por reintentos o doble click.
- Los estados `PENDING` y `FAILED` no cambian `approvalStatus` a `SENT`; solo `SENT` o `DELIVERED` del proveedor marcan el flujo como enviado.
- Errores recuperables dejan `nextAttemptAt` auditable y permiten reintento controlado hasta `FORMAL_DELIVERY_MAX_ATTEMPTS`.
- Panel ops muestra intento actual, maximo de intentos, ultimo intento y proximo reintento en estado e historial de entrega.
- Variables backend `FORMAL_DELIVERY_PROVIDER`, `FORMAL_DELIVERY_MAX_ATTEMPTS`, `FORMAL_DELIVERY_RETRY_DELAY_SECONDS` y `FORMAL_DELIVERY_WEBHOOK_URL` quedan validadas en entorno, sin serializar secretos ni payload completo al frontend.

Validacion ejecutada:

- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run prisma:seed`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Prueba HTTP local: solicitud, aprobacion y envio formal sobre owner lead seed; resultado `SENT`/`DELIVERED`, proveedor `dev_transactional_log`, intento `1/3` y segundo envio bloqueado sin duplicar delivery.

## Incremento contrato webhook delivery formal implementado

Se preparo el contrato generico para un futuro proveedor externo de delivery formal sin habilitar envios reales.

Alcance entregado:

- Documento de contrato en [docs/architecture/formal-delivery-webhook.md](architecture/formal-delivery-webhook.md).
- Tipos backend `FormalDeliveryWebhookRequest` y `FormalDeliveryWebhookResponseBody`.
- Builder `buildFormalDeliveryWebhookRequest` para fijar payload, headers e idempotencia esperada.
- Normalizador `normalizeFormalDeliveryWebhookResponse` para mapear `SENT`, `DELIVERED`, `FAILED`, timestamps y errores del proveedor.
- Variables `FORMAL_DELIVERY_*` agregadas a `.env.example` y `apps/api/.env.example`, con `FORMAL_DELIVERY_PROVIDER=dev` por defecto.
- Guard rail `webhook_provider_disabled`: configurar `FORMAL_DELIVERY_PROVIDER=webhook` no envia datos externos; registra fallo controlado hasta aprobar proveedor/destino y transporte.

## Incremento disponibilidad y tarifas implementado

Se agrego una cotizacion publica inicial conectada a persistencia, sin crear hold, reserva ni pago.

Alcance entregado:

- Modelos Prisma `AvailabilityBlock`, `RatePlan` y `StayQuote`; `StayCode` ahora puede apuntar a una unidad concreta.
- Migracion `20260824000100_stay_availability_quote`.
- Seed dev con codigos publicos de estancia, tarifas base Atitlan/Antigua y bloqueo operativo demo.
- Endpoint publico `POST /api/public/stay-quotes` que valida fechas, capacidad, reservas `HOLD`/`CONFIRMED`, bloqueos y minimo de noches.
- Calculo de subtotal por noches, tarifa fin de semana, limpieza, servicio KUQUBA, impuestos estimados y total.
- Cotizaciones persistidas y auditadas sin contacto personal ni reserva confirmada.
- Panel publico de cotizacion en `/stay/properties/[id]` como primer paso del flujo de reserva directa.

Validacion ejecutada:

- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Pendiente con Docker local activo:

- `npm run prisma:deploy`
- `npm run prisma:seed`
- Prueba HTTP de `POST /api/public/stay-quotes` para caso disponible y caso ocupado.

## Incremento reserva hold implementado

Se agrego la conversion de una cotizacion disponible en hold temporal persistido, sin confirmar pago ni contrato comercial definitivo.

Alcance entregado:

- Enum `ReservationStatus` extendido con `PENDING_PAYMENT` y `EXPIRED`.
- `Reservation` guarda `stayQuoteId`, `holdExpiresAt`, `currency`, `total` y fuente de confirmacion.
- Migracion `20260824000200_reservation_hold` para campos de hold, indices e integridad con `StayQuote`.
- Endpoint publico `POST /api/public/stay-holds` que convierte una `StayQuote` disponible y vigente en `Reservation(HOLD)`.
- Idempotencia por `stayQuoteId` y vencimiento de holds expirados antes de revisar conflictos.
- Disponibilidad ahora bloquea contra `CONFIRMED`, `HOLD` y `PENDING_PAYMENT` solo cuando los holds siguen vigentes.
- Portal huesped `/stay/home` reemplaza el placeholder y consume `GET /api/guest/portal` con reservas/holds reales de la sesion.
- Auditoria para creacion de hold y lectura de portal guest, sin guardar contacto en claro en eventos publicos.

Validacion ejecutada:

- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Typecheck especifico de `apps/api/prisma/seed.ts`.

Pendiente con Docker local activo:

- `npm run prisma:deploy`
- `npm run prisma:seed`
- Prueba HTTP de `POST /api/public/stay-quotes`, `POST /api/public/stay-holds` y `GET /api/guest/portal`.

## Incremento pagos checkout dev implementado

Se agrego un checkout dev sobre holds vigentes para cerrar el flujo funcional de cotizacion -> hold -> pago pendiente -> reserva confirmada sin ejecutar cobros reales.

Alcance entregado:

- Enum Prisma `PaymentStatus` y modelo `Payment` extendido con estado, idempotencia, checkout URL, vencimiento, confirmacion/fallo y referencia de proveedor.
- Migracion `20260824000300_dev_payment_checkout`.
- Endpoints publicos `POST /api/public/payment-checkouts`, `POST /api/public/payment-checkouts/confirm` y `POST /api/public/payment-checkouts/fail`.
- Iniciar checkout sobre `Reservation(HOLD)` vigente cambia la reserva a `PENDING_PAYMENT` y crea `Payment(PENDING)` idempotente a nivel de reserva activa.
- Confirmacion dev marca `Payment(SUCCEEDED)`, cambia la reserva a `CONFIRMED`, limpia `holdExpiresAt` y genera `LedgerEntry` base desde la cotizacion.
- Fallo o vencimiento de pago no confirma la reserva y deja auditoria trazable sin payloads ni secretos de proveedor.
- Panel publico de cotizacion permite crear hold, iniciar checkout dev, confirmar o marcar fallo.
- Portal huesped muestra el ultimo pago asociado a cada reserva y caduca holds/checkouts vencidos antes de responder.

Validacion ejecutada:

- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Typecheck especifico de `apps/api/prisma/seed.ts`.

Pendiente con Docker local activo:

- `npm run prisma:deploy`
- `npm run prisma:seed`
- Prueba HTTP de `POST /api/public/stay-quotes`, `POST /api/public/stay-holds`, `POST /api/public/payment-checkouts`, `/confirm`, `/fail` y `GET /api/guest/portal`.

## Incremento contratos y firma dev implementado

Se agrego contrato owner versionado y aceptacion dev auditada, cerrando el siguiente paso funcional antes de integrar proveedor externo de firma.

Alcance entregado:

- Enum Prisma `ContractStatus`, campos de emision/firma/evidencia en `Contract` y nuevo modelo `ContractVersion`.
- Migracion `20260824000400_contract_signature`.
- Permiso `contract:self:sign` agregado al rol owner dev.
- Endpoint ops `POST /api/ops/workbench/:itemType/:id/case/conversion/contract/issue` para emitir contrato desde onboarding aprobado.
- Panel ops muestra estado de contrato, version emitida, fechas y referencia de firma.
- Endpoint owner `POST /api/owner/contracts/:contractId/accept-dev` para aceptar contrato pendiente de firma con evidencia hash e idempotencia si ya esta activo.
- Portal owner muestra contrato por propiedad, terminos base, version, estado, referencia y boton de aceptacion cuando corresponde.
- Seed dev incluye un contrato activo y uno pendiente de firma para probar el flujo.

Validacion ejecutada:

- `npm.cmd exec --workspace @kuquba/api -- prisma format --schema prisma/schema.prisma`
- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Typecheck especifico de `apps/api/prisma/seed.ts`.

Pendiente con Docker local activo:

- `npm run prisma:deploy`
- `npm run prisma:seed`
- Prueba HTTP de emision Ops y aceptacion owner dev.
- `docker compose ps` no respondio en este entorno y se interrumpio manualmente.

## Incremento finanzas owner implementado

Se agrego una proyeccion financiera dev para propietario, conectada al portal owner y respaldada por ledger/settlements persistidos.

Alcance entregado:

- Enum Prisma `OwnerSettlementStatus` y modelos `OwnerSettlement` y `OwnerSettlementLine`.
- Migracion `20260824000500_owner_finance_settlement`.
- `OwnerSettlementLine` referencia opcionalmente `LedgerEntry` y `Reservation` para mantener trazabilidad sin reescribir el ledger.
- `GET /api/owner/portal` ahora devuelve `financeSummary` y `settlements` por sesion owner.
- Portal owner muestra ingresos, servicio KUQUBA, gastos, saldo owner, estado de liquidacion y lineas conciliadas.
- Seed dev agrega cuenta ledger, entradas financieras de reserva/gasto y una liquidacion de agosto lista para revision.
- Payout, FEL/soportes fiscales y conciliacion bancaria real quedan deshabilitados hasta aprobar proveedores productivos.

Validacion ejecutada:

- `npm.cmd exec --workspace @kuquba/api -- prisma format --schema prisma/schema.prisma`
- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Typecheck especifico de `apps/api/prisma/seed.ts`.

Pendiente con Docker local activo:

- `npm run prisma:deploy`
- `npm run prisma:seed`
- Prueba HTTP de `GET /api/owner/portal` validando `financeSummary` y `settlements`.

## Incremento housekeeping y mantenimiento implementado

Se agrego un modulo operativo dev para coordinar limpieza, turnovers e incidencias tecnicas desde Ops, conectado a propiedades, unidades y reservas existentes.

Alcance entregado:

- Enums Prisma `HousekeepingTaskStatus`, `MaintenanceTicketStatus` y `MaintenanceSeverity`.
- Modelos `HousekeepingTask` y `MaintenanceTicket` con propiedad, unidad opcional, reserva opcional para turnovers, responsables nominales, proveedor, fechas, checklist, severidad y cierre.
- Migracion `20260824000600_ops_operations_housekeeping_maintenance`.
- Seed dev con limpiezas de salida/preparacion, inspeccion preventiva y tickets de mantenimiento Atitlan/Antigua.
- Endpoint Ops `GET /api/ops/operations` para tablero operacional con metricas, tareas de housekeeping y tickets de mantenimiento.
- Endpoints Ops `PATCH /api/ops/operations/housekeeping/:taskId/status` y `PATCH /api/ops/operations/maintenance/:ticketId/status` para cambiar estado con auditoria.
- `/ops/home` muestra tablero de housekeeping/mantenimiento, fechas, ventanas, proveedor/responsable, reserva asociada, checklist, severidad y selector de estado.
- Auditoria reciente de Ops incluye `OpsOperationsDashboard`, `HousekeepingTask` y `MaintenanceTicket`.

Validacion ejecutada:

- `npm.cmd exec --workspace @kuquba/api -- prisma format --schema prisma/schema.prisma`
- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run prisma:seed`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Typecheck especifico de `apps/api/prisma/seed.ts`.
- Verificacion Prisma directa: `HousekeepingTask=3`, `MaintenanceTicket=2`.
- Prueba HTTP autenticada de `GET /api/ops/operations`: `200`, 3 housekeeping, 2 maintenance.
- Prueba HTTP autenticada de `PATCH /api/ops/operations/housekeeping/:taskId/status`: `200`, cambio a `IN_PROGRESS` auditado.
- `npm run prisma:seed` reejecutado despues del PATCH para restaurar datos dev base.

Pendiente opcional:

- Revision visual/manual de `/ops/home` en navegador.

Notas de alcance:

- Punto 6, gestion IAM desde UI, queda cerrado con panel Ops, rol `iam_admin`, mutaciones protegidas por `identity:user:manage` y auditoria.
- Punto 7, proveedor externo de delivery, queda preparado para formalizar Resend despues; no se activo egress externo sin destino y payload aprobados.

## Incremento observabilidad productiva base implementado

Se agrego una capa base de observabilidad para operar API y dominio sin exponer PII ni secretos.

Alcance entregado:

- Plugin API de observabilidad con medicion de requests, duracion, ruta, codigo HTTP y correlationId.
- Endpoint GET /metrics en formato Prometheus text exposition.
- Proteccion de /metrics con OBSERVABILITY_METRICS_TOKEN obligatorio en produccion y soporte de Authorization: Bearer o X-KUQUBA-Metrics-Token.
- Redaccion ampliada de headers sensibles en logs: autorizacion, cookies, tokens dev, tokens de metricas, API keys y firmas de delivery.
- Metricas tecnicas de proceso/API y metricas de dominio para reservas, pagos, delivery formal, housekeeping, mantenimiento y auditoria.
- Runbook operativo y alertas minimas documentadas en [docs/operations/observability.md](operations/observability.md).

Validacion ejecutada:

- npm run lint
- npm run typecheck
- npm run build
- Prueba HTTP local de GET /metrics desde Docker: 200, metricas kuquba_http_requests_total, kuquba_http_request_duration_ms y metricas de dominio presentes.
- Log API confirmado con evento http.request.observed y correlationId.

Notas de alcance:

- Punto 6, gestion IAM desde UI, queda cerrado con panel Ops, rol `iam_admin`, mutaciones protegidas por `identity:user:manage` y auditoria.
- Punto 7, proveedor externo de delivery, queda preparado para formalizar Resend despues; no se activo egress externo sin destino y payload aprobados.
- Observabilidad queda en base productiva; quedan para infraestructura gestionada los dashboards reales, trazas OpenTelemetry y SLOs numericos definitivos.

## Incremento gestion IAM Ops implementado

Se agrego un modulo IAM dev para que Ops pueda ver usuarios, roles, permisos y modificar asignaciones desde `/ops/home` con auditoria.

Alcance entregado:

- Rol `iam_admin` en el catalogo compartido y usuario seed `iam.admin@kuquba.local`.
- Acceso Ops acepta `ops_admin` o `iam_admin` para audiencia `ops`.
- Endpoints protegidos `GET /api/ops/iam`, `POST /api/ops/iam/users/:userId/roles`, `DELETE /api/ops/iam/user-roles/:assignmentId`, `POST /api/ops/iam/roles/:roleId/permissions` y `DELETE /api/ops/iam/roles/:roleId/permissions/:permissionId`.
- Las mutaciones IAM requieren `identity:user:manage`, guardan `AuditEvent` y bloquean quitar el ultimo rol Ops o el ultimo permiso IAM del actor.
- Panel Ops muestra usuarios, roles, permisos, asignaciones por scope/recurso y auditoria IAM reciente.

Validacion ejecutada:

- `npm run prisma:seed`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Prueba HTTP local de login `iam.admin@kuquba.local`: rol `iam_admin` con permiso `identity:user:manage`.
- Prueba HTTP local de `GET /api/ops/iam`: `200`, usuarios/roles/permisos visibles.
- Prueba HTTP local de asignar y revocar rol temporal: auditoria `ops.iam.user_role.assign` y `ops.iam.user_role.revoke`.
- Prueba HTTP local de agregar y revocar permiso temporal: auditoria `ops.iam.role_permission.grant` y `ops.iam.role_permission.revoke`.

## Siguiente incremento recomendado

Retomar el pendiente explicito de proveedor externo: formalizar Resend cuando esten aprobados dominio, API key, destino de pruebas y payload transaccional.

## Plan UI/UX

Se agrego el plan de seguimiento de mejoras UI/UX en [docs/ui-ux-improvement-plan.md](ui-ux-improvement-plan.md). El orden recomendado inicia por disponibilidad guiada en reserva publica, seguido por portal guest, portal owner y consola Ops.
