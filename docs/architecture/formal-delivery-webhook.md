# Contrato webhook de delivery formal

Ultima actualizacion: 2026-08-23

Este contrato define el payload generico para un futuro proveedor externo de delivery formal. No activa envios reales: el adaptador sigue fail-closed cuando `FORMAL_DELIVERY_PROVIDER=webhook` hasta aprobar proveedor, destino y transporte.

## Alcance

- Canal inicial: `EMAIL`.
- Entidades cubiertas: onboarding formal de propiedad y propuesta formal de estancia.
- Origen: flujo ops ya aprobado internamente.
- Outbox: `OpsFormalDelivery` conserva idempotencia, intentos, estado, timestamps y errores.
- Seguridad: frontend y auditoria no reciben secretos ni payload completo con contacto en claro.

## Activacion pendiente

Para habilitar envio externo real falta aprobar:

- `FORMAL_DELIVERY_WEBHOOK_URL` del proveedor o gateway autorizado.
- `FORMAL_DELIVERY_API_KEY` o mecanismo equivalente de autenticacion backend-to-backend.
- Lista exacta de campos permitidos con datos personales.
- Politica de retencion/logs del proveedor.
- Manejo de fallos recuperables y no recuperables.

## Request

Metodo: `POST`.

Headers esperados:

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <FORMAL_DELIVERY_API_KEY>
Idempotency-Key: <ops-formal-delivery-idempotency-key>
X-KUQUBA-Delivery-Channel: EMAIL
X-KUQUBA-Template-Key: stay_proposal_guest_v1
X-KUQUBA-Template-Version: 1
```

Body:

```json
{
  "idempotencyKey": "<same value as header>",
  "channel": "EMAIL",
  "recipient": {
    "address": "guest@example.com",
    "name": "Guest Name"
  },
  "template": {
    "key": "stay_proposal_guest_v1",
    "version": 1
  },
  "message": {
    "subject": "Propuesta KUQUBA - Estancia",
    "body": ["Linea 1", "Linea 2"]
  },
  "metadata": {
    "contractVersion": 1,
    "source": "kuquba_ops_formal_delivery"
  }
}
```

## Response aceptada

El proveedor debe responder `2xx` con JSON. Campos soportados:

```json
{
  "providerMessageId": "provider-message-id",
  "status": "SENT",
  "acceptedAt": "2026-08-23T12:00:00.000Z",
  "sentAt": "2026-08-23T12:00:01.000Z",
  "deliveredAt": null
}
```

Valores soportados de `status`: `SENT`, `DELIVERED` y `FAILED`. Si el proveedor omite `status`, KUQUBA debe interpretar un `2xx` como `SENT`.

## Fallos y reintentos

- HTTP `408`, `425`, `429`, `500`, `502`, `503` y `504` deben tratarse como recuperables.
- Timeouts y errores de red deben tratarse como recuperables.
- Otros codigos HTTP no `2xx` deben quedar como `FAILED` no recuperable.
- Un `2xx` con `status: "FAILED"` puede incluir `retryable: true` para habilitar reintento controlado.
- Un fallo recuperable debe conservar `approvalStatus` sin pasar a `SENT` y programar `nextAttemptAt`.

## Estado actual

Implementado ahora:

- Tipos backend del request/response webhook.
- Builder de request `buildFormalDeliveryWebhookRequest`.
- Normalizador de respuesta `normalizeFormalDeliveryWebhookResponse`.
- Guard rail fail-closed `webhook_provider_disabled` en el adaptador.

No implementado todavia:

- Llamada HTTP real al proveedor.
- Webhooks inbound de tracking/bounce.
- Secretos productivos o URL autorizada.
