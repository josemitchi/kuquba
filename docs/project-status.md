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
- Bandeja ops autenticada disponible en `/ops/home` conectada a `GET /api/ops/workbench`.
- Cambios de estado ops persistidos por `PATCH /api/ops/workbench/:itemType/:id/status`.
- Expediente ops autenticado disponible por item con `GET/PATCH /api/ops/workbench/:itemType/:id/case`.
- Notas y tareas internas ops persistidas por endpoints protegidos de caso.
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

## Siguiente incremento recomendado

Construir la transicion desde expediente ops hacia flujo formal.

Alcance propuesto:

- Convertir caso de propietario en checklist de onboarding de propiedad.
- Convertir solicitud de estancia en propuesta formal versionada.
- Asociar responsable ops y fechas objetivo reales por tarea.
- Preparar estados de aprobacion antes de publicar propiedad o enviar propuesta.

## Criterios de aceptacion del siguiente incremento

- La conversion requiere sesion interna valida.
- El caso conserva historial y referencia al item publico original.
- La transicion crea entidades persistidas y auditadas, no solo cambios visuales.
- La UI muestra claramente si el caso ya fue convertido.
- `npm run lint`, `npm run typecheck` y `npm run build` pasan.
