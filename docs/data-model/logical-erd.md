# ERD lógico inicial

Este modelo es una base conceptual para orientar Fase 1 y Fase 2. No representa todavía migraciones definitivas.

```mermaid
erDiagram
  Organization ||--o{ User : contains
  Organization ||--o{ Property : operates
  Organization ||--o{ Owner : manages
  Property ||--o{ Unit : contains
  Property ||--o{ StayCode : exposes
  Owner ||--o{ Contract : signs
  Property ||--o{ Contract : governed_by
  Guest ||--o{ Reservation : books
  Unit ||--o{ Reservation : reserved_for
  Reservation ||--o{ Payment : receives
  Reservation ||--o{ LedgerEntry : produces
  LedgerAccount ||--o{ LedgerEntry : records
  Property ||--o{ HousekeepingTask : schedules
  Property ||--o{ MaintenanceTicket : tracks
  User ||--o{ AuditEvent : performs
```

## Principios

- El Código de Estancia localiza una propiedad, pero no es una credencial de seguridad.
- El ledger financiero debe ser append-only.
- La participación de propietario/KUQUBA debe vivir en contrato o configuración, no en código.
- El dominio no debe depender directamente de proveedores de pagos, OTA, FEL, WhatsApp o storage.
