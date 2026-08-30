# Observabilidad productiva

Ultima actualizacion: 2026-08-28

Este runbook define la observabilidad minima para operar KUQUBA sin exponer PII ni secretos. La implementacion actual cubre logs estructurados, metricas Prometheus-style y metricas de dominio desde Prisma.

## Superficies

- `GET /health`: healthcheck publico y liviano del API.
- `GET /metrics`: endpoint de metricas en formato Prometheus text exposition.
- Logs Fastify/Pino: request lifecycle, errores, auditoria y eventos HTTP observados con `correlationId`.

## Seguridad

- En produccion `OBSERVABILITY_METRICS_TOKEN` es obligatorio; sin token la API no arranca.
- `/metrics` acepta `Authorization: Bearer <OBSERVABILITY_METRICS_TOKEN>` o `X-KUQUBA-Metrics-Token`.
- En desarrollo/test, si el token esta vacio, `/metrics` permite scrape local.
- Los logs redactan `authorization`, `cookie`, `x-api-key`, `x-kuquba-dev-session`, `x-kuquba-metrics-token`, `x-kuquba-signature` y `x-resend-signature`.
- Las metricas no usan labels con email, telefono, token, nombre de huesped/propietario, id de entidad ni payloads.

## Metricas tecnicas

- `kuquba_api_build_info`: metadatos del servicio.
- `kuquba_api_start_time_seconds`: inicio del proceso.
- `kuquba_api_process_uptime_seconds`: uptime del proceso.
- `kuquba_api_process_heap_used_bytes`: heap usado.
- `kuquba_api_process_rss_bytes`: memoria residente.
- `kuquba_http_requests_total`: contador por `method`, `route`, `status_code`, `status_class`.
- `kuquba_http_request_duration_ms`: histograma por `method`, `route`, `status_code`, `status_class`.

## Metricas de dominio

- `kuquba_domain_reservations_total{status}`.
- `kuquba_domain_payments_total{status}`.
- `kuquba_domain_formal_deliveries_total{status}`.
- `kuquba_domain_housekeeping_tasks_total{status}`.
- `kuquba_domain_maintenance_tickets_total{status,severity}`.
- `kuquba_domain_audit_events_total{result}`.
- `kuquba_domain_expired_holds_total`.
- `kuquba_domain_stale_pending_payments_total`.
- `kuquba_domain_retryable_formal_delivery_failures_total`.
- `kuquba_domain_blocked_housekeeping_tasks_total`.
- `kuquba_domain_priority_maintenance_tickets_total`.
- `kuquba_domain_recent_audit_failures_total`.

## Alertas minimas

- API 5xx: `sum(rate(kuquba_http_requests_total{status_class="5xx"}[5m])) > 0`.
- Latencia alta: percentil 95 de `kuquba_http_request_duration_ms` por ruta supera el SLO definido.
- Delivery formal atascado: `kuquba_domain_retryable_formal_delivery_failures_total > 0` por mas de 10 minutos.
- Pagos pendientes vencidos: `kuquba_domain_stale_pending_payments_total > 0`.
- Holds vencidos sin expiracion: `kuquba_domain_expired_holds_total > 0`.
- Housekeeping bloqueado: `kuquba_domain_blocked_housekeeping_tasks_total > 0`.
- Mantenimiento critico activo: `kuquba_domain_priority_maintenance_tickets_total > 0`.
- Auditoria con fallos recientes: `kuquba_domain_recent_audit_failures_total > 5` en 15 minutos.

## Scrape local

Con entorno dev sin token:

```bash
curl http://127.0.0.1:4000/metrics
```

Con token:

```bash
curl -H "Authorization: Bearer $OBSERVABILITY_METRICS_TOKEN" http://127.0.0.1:4000/metrics
```

## Operacion de incidente

1. Usar `correlationId` del error o respuesta para buscar logs del request.
2. Revisar `kuquba_http_requests_total` y `kuquba_http_request_duration_ms` para impacto tecnico.
3. Revisar metricas de dominio relacionadas: pagos, delivery, holds, housekeeping, mantenimiento o auditoria.
4. Si la causa toca proveedor externo, confirmar que el log no incluya secretos y revisar estado en el proveedor usando `providerMessageId` cuando aplique.
5. Registrar el cierre del incidente en auditoria o runbook externo segun severidad.

## Pendiente productivo

- Exportar trazas distribuidas OpenTelemetry cuando haya servicios externos reales.
- Configurar dashboards gestionados en la plataforma de infraestructura elegida.
- Definir SLOs numericos por ruta y por flujo de negocio.
- Integrar webhooks inbound de Resend u otro proveedor cuando se active delivery externo.