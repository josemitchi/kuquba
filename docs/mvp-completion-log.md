# Bitacora de cierre MVP KUQUBA

Ultima actualizacion: 2026-08-29

Esta bitacora ordena los pendientes para llegar a un MVP operable sin depender de proveedores externos. Los proveedores reales de email/pago se conectaran despues de validar los flujos internos con adaptadores dev.

## Estado de los 7 puntos

| #   | Punto                                                                  | Estado              | Criterio de cierre                                                                                                         |
| --- | ---------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Limpieza operativa de reservas y modulo Ops de reservas/disponibilidad | Cerrado dev         | Ops puede ver reservas, pagos, holds, bloqueos proximos, filtrar estados y liberar/cancelar reservas con auditoria.        |
| 2   | Gestion administrativa de reservas                                     | Cerrado dev         | Ops puede revisar detalle de reserva, registrar confirmacion dev, cancelar, liberar hold y consultar auditoria contextual. |
| 3   | Calendario de disponibilidad                                           | Cerrado dev         | Ops puede ver ocupacion por propiedad/unidad y distinguir reservas, holds, bloqueos owner, Ops y mantenimiento.            |
| 4   | Portal huesped completo                                                | Cerrado dev         | Huesped ve detalle de reserva, estado de pago, llegada/check-in y confirmacion consultable.                                |
| 5   | Portal owner completo                                                  | Cerrado dev         | Owner ve propiedades publicadas, reservas asociadas, ingresos estimados y puede solicitar bloqueo de fechas.               |
| 6   | Emails transaccionales                                                 | Pendiente proveedor | Confirmacion de reserva, acceso a portal y avisos Ops/owner listos para conectar a Resend u otro proveedor aprobado.       |
| 7   | Hardening final                                                        | Cerrado dev         | Seeds demo limpios, pruebas HTTP automatizadas, observabilidad revisable, env documentado y guia de demo MVP.              |

## Cierre dev punto 1

Implementado en este corte:

- Endpoint Ops `GET /api/ops/reservations` para tablero de reservas y disponibilidad.
- Endpoint Ops `PATCH /api/ops/reservations/:reservationId/status` para liberar holds (`EXPIRED`) o cancelar reservas (`CANCELLED`).
- Auditoria para lectura del tablero y cambios manuales de estado.
- Modulo UI Ops `Reservas` con metricas, filtros por estado, tabla de reservas, estado de pago y bloqueos manuales proximos.
- Acciones UI para liberar holds pendientes o cancelar reservas operables.

Validacion de cierre dev:

- `GET /api/ops/reservations` autenticado respondio con reservas y bloqueos manuales.
- Se creo un hold dev `KQB-HOLD-3F69CD4C` para `2026-11-10` a `2026-11-12`.
- `PATCH /api/ops/reservations/:reservationId/status` cambio el hold a `EXPIRED`.
- Una nueva cotizacion para las mismas fechas volvio a responder `AVAILABLE`, confirmando liberacion de disponibilidad.
- `lint` y `typecheck` pasaron despues del cambio.

Pendiente visual/manual:

- Revisar en navegador que el modulo `Reservas` tenga buen ancho y lectura en desktop.

## Cierre dev punto 2

Implementado en este corte:

- Detalle administrativo al seleccionar una reserva dentro del modulo Ops `Reservas`.
- Auditoria contextual reciente por reserva dentro del panel de detalle.
- Accion `Confirmacion dev` para reservas `CONFIRMED`, sin proveedor externo y con destinatario enmascarado.
- Acciones de liberar hold y cancelar tambien disponibles desde el detalle.
- Endpoint `POST /api/ops/reservations/:reservationId/confirmation-dev` protegido por sesion Ops y permisos operativos.

Validacion de cierre dev:

- `POST /api/ops/reservations/:reservationId/confirmation-dev` autenticado registro confirmacion dev sobre `KQB-ATITLAN-20260824`.
- La respuesta devolvio destinatario enmascarado y auditoria contextual con `ops.reservations.confirmation_dev.send`.
- `lint`, `typecheck` y `build` pasaron despues del cambio.

## Cierre dev punto 3

Implementado en este corte:

- Vista calendario dentro de `Ops > Reservas` con ventana operativa de 60 dias.
- Filas agrupadas por propiedad/unidad.
- Eventos visuales para reservas `CONFIRMED`, `HOLD` y `PENDING_PAYMENT`.
- Eventos visuales para bloqueos manuales `OWNER_HOLD`, `OPS_HOLD` y `MAINTENANCE`.
- Leyenda de colores para distinguir ocupacion y tipos de bloqueo.
- Click sobre eventos de reserva para seleccionar su detalle administrativo.

Validacion de cierre dev:

- El calendario usa el mismo payload autenticado de `GET /api/ops/reservations`.
- `lint`, `typecheck` y `build` pasaron despues del cambio.

## Cierre dev punto 4

Implementado en este corte:

- Payload de `GET /api/guest/portal` enriquecido con destino de propiedad, datos de llegada/check-in y confirmacion por reserva.
- Panel de detalle en `/stay/home` para la reserva seleccionada.
- Detalle de llegada con ventana de check-in, hora de check-out, estado operativo e instrucciones.
- Detalle de pago con estado, monto, referencia y fecha de confirmacion cuando aplica.
- Confirmacion consultable con secciones de reserva, propiedad, fechas y estado de pago.
- Seleccion de reserva desde el historial para revisar su detalle.

Validacion de cierre dev:

- `GET /api/guest/portal` autenticado para `qa.guest@kuquba.local` devolvio reserva confirmada con destino, check-in `15:00 - 20:00`, check-out `11:00`, documento `Confirmacion de reserva` y pago confirmado.
- `lint` y `typecheck` pasaron despues del cambio.

## Cierre dev punto 5

Implementado en este corte:

- Payload de `GET /api/owner/portal` enriquecido con reservas por propiedad, reservas globales owner, unidades, bloqueos vigentes e ingresos estimados por propiedad.
- Portal owner muestra reservas asociadas por propiedad con código, fechas, huésped, pago y total.
- Portal owner muestra ingreso bruto confirmado y saldo owner estimado por propiedad.
- Formulario owner para solicitar bloqueo de fechas por propiedad/unidad.
- Endpoint `POST /api/owner/availability-blocks` protegido por sesión owner y propiedades asignadas.
- Bloqueo owner persiste como `AvailabilityBlock` con razon `OWNER_HOLD`, valida conflictos contra reservas activas y bloqueos existentes, y registra auditoria.

Validacion de cierre dev:

- `GET /api/owner/portal` autenticado para `owner.dev@kuquba.local` devolvio 2 propiedades y 13 reservas asociadas.
- Solicitud de bloqueo owner para `Villa Luz de Atitlan` del `2027-01-10` al `2027-01-12` respondio `OWNER_HOLD` y quedo visible en el portal refrescado.
- Ingresos estimados por propiedad devueltos: bruto `33051.80`, saldo owner estimado `27102.48` para la propiedad validada.
- `lint`, `typecheck` y `build` pasaron después del cambio.

## Cierre dev punto 7

Implementado en este corte:

- Script `test:mvp:http` para validar el MVP por contrato HTTP contra el API local.
- Prueba automatizada de healthcheck, metricas, catalogo publico, cotizacion, hold, checkout dev, confirmacion de pago, portal guest, portal owner, tablero Ops, confirmacion dev Ops, cancelacion Ops y liberacion de disponibilidad.
- Guia operativa de demo MVP en `docs/operations/mvp-demo-runbook.md`.
- Variables clave, cuentas demo y endpoints de observabilidad documentados.

Validacion de cierre dev:

- La prueba HTTP crea datos con correo unico `qa.mvp.<timestamp>@kuquba.local` y cancela la reserva al final para liberar disponibilidad.
- Criterio de salida local: `lint`, `typecheck`, `build` y `test:mvp:http`.
