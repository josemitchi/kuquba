# Guia de demo MVP KUQUBA

Ultima actualizacion: 2026-08-30

Esta guia permite levantar y validar el MVP sin proveedores externos. Email, pago y delivery formal usan adaptadores dev; Resend y proveedor de pago quedan fuera del cierre local.

## Prerrequisitos

- Node.js >= 20.11
- npm >= 10
- PostgreSQL y Redis disponibles por Docker Compose o servicios locales equivalentes
- Archivo `.env` local con `DEV_OTP_CODE=000000` para demo
- API en `http://127.0.0.1:4000`
- Web en `http://127.0.0.1:3000`

## Preparacion limpia

```bash
docker compose up -d postgres redis
npm install
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

## Cuentas demo

| Portal | Usuario                                        | Codigo   |
| ------ | ---------------------------------------------- | -------- |
| Ops    | `iam.admin@kuquba.local`                       | `000000` |
| Owner  | `owner.dev@kuquba.local`                       | `000000` |
| Guest  | correo creado al confirmar una reserva publica | `000000` |

## Validacion automatizada

Con el API levantado:

```bash
npm run test:mvp:http
```

La prueba cubre:

- `GET /health`
- `GET /metrics`
- catalogo publico de estancias
- cotizacion disponible
- hold temporal
- checkout dev
- confirmacion de pago dev
- provisionamiento y lectura de portal guest
- lectura de portal owner
- lectura de reservas Ops
- confirmacion dev Ops
- cancelacion Ops y liberacion de disponibilidad

## Flujo demo manual

1. Entra a `http://127.0.0.1:3000`.
2. Busca una estancia y abre el detalle.
3. Cotiza fechas disponibles, crea reserva y confirma pago dev.
4. Entra al portal guest con el correo usado en la reserva y codigo `000000`.
5. Entra a Ops con `iam.admin@kuquba.local`, abre `Reservas` y valida la reserva.
6. Registra `Confirmacion dev` desde Ops.
7. Cancela o libera la reserva desde Ops y vuelve a cotizar las mismas fechas.
8. Entra al portal owner con `owner.dev@kuquba.local` y revisa reservas, ingresos estimados y bloqueos.

## Observabilidad

- Healthcheck: `GET http://127.0.0.1:4000/health`
- Metricas: `GET http://127.0.0.1:4000/metrics`
- En produccion, `/metrics` requiere `OBSERVABILITY_METRICS_TOKEN`.
- Runbook detallado: `docs/operations/observability.md`

## Variables clave

| Variable                      | Uso                                        |
| ----------------------------- | ------------------------------------------ |
| `DATABASE_URL`                | Conexion PostgreSQL Prisma                 |
| `REDIS_URL`                   | Redis local si aplica                      |
| `DEV_OTP_CODE`                | Codigo OTP dev para portales               |
| `NEXT_PUBLIC_API_BASE_URL`    | API usada por la web                       |
| `API_BASE_URL`                | API usada por `test:mvp:http`              |
| `OBSERVABILITY_METRICS_TOKEN` | Token para proteger metricas en produccion |

## Criterio de salida MVP local

El MVP local esta listo para demo cuando pasan:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:mvp:http
```
