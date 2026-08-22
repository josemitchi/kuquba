# ERD lÃ³gico inicial

Este modelo es una base conceptual para orientar Fase 1 y Fase 2. No representa todavÃ­a migraciones definitivas.

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
  User ||--o{ OpsCaseNote : writes
  OwnerLead ||--o| OpsCase : opens
  StayProposalRequest ||--o| OpsCase : opens
  OpsCase ||--o{ OpsCaseNote : records
  OpsCase ||--o{ OpsCaseTask : drives
```

## Principios

- El CÃ³digo de Estancia localiza una propiedad, pero no es una credencial de seguridad.
- El ledger financiero debe ser append-only.
- La participaciÃ³n de propietario/KUQUBA debe vivir en contrato o configuraciÃ³n, no en cÃ³digo.
- El dominio no debe depender directamente de proveedores de pagos, OTA, FEL, WhatsApp o storage.
- `OpsCase` concentra seguimiento interno y no sustituye las entidades publicas de origen.
