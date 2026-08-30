# ERD lÃƒÂ³gico inicial

Este modelo es una base conceptual para orientar Fase 1 y Fase 2. No representa todavÃƒÂ­a migraciones definitivas.

```mermaid
erDiagram
  Organization ||--o{ User : contains
  Organization ||--o{ Property : operates
  Organization ||--o{ Owner : manages
  Property ||--o{ Unit : contains
  Property ||--o{ StayCode : exposes
  Unit ||--o{ StayCode : publishes_as
  Property ||--o{ RatePlan : prices
  Unit ||--o{ RatePlan : priced_by
  Property ||--o{ AvailabilityBlock : blocks
  Unit ||--o{ AvailabilityBlock : blocked_for
  Property ||--o{ StayQuote : quotes
  Unit ||--o{ StayQuote : quoted_for
  Owner ||--o{ Contract : signs
  Owner ||--o{ OwnerSettlement : receives
  Property ||--o{ Contract : governed_by
  Property ||--o{ OwnerSettlement : settles
  Contract ||--o{ ContractVersion : versions
  Guest ||--o{ Reservation : books
  Unit ||--o{ Reservation : reserved_for
  StayQuote ||--o| Reservation : creates_hold
  Reservation ||--o{ Payment : receives
  Reservation ||--o{ LedgerEntry : produces
  Reservation ||--o{ OwnerSettlementLine : explains
  LedgerAccount ||--o{ LedgerEntry : records
  LedgerEntry ||--o{ OwnerSettlementLine : supports
  OwnerSettlement ||--o{ OwnerSettlementLine : details
  Property ||--o{ HousekeepingTask : schedules
  Unit ||--o{ HousekeepingTask : serviced_by
  Reservation ||--o{ HousekeepingTask : triggers_turnover
  Property ||--o{ MaintenanceTicket : tracks
  Unit ||--o{ MaintenanceTicket : affected_by
  User ||--o{ AuditEvent : performs
  User ||--o{ OpsCaseNote : writes
  OwnerLead ||--o| OpsCase : opens
  StayProposalRequest ||--o| OpsCase : opens
  OpsCase ||--o{ OpsCaseNote : records
  OpsCase ||--o{ OpsCaseTask : drives
  OwnerLead ||--o| PropertyOnboarding : converts_to
  OpsCase ||--o| PropertyOnboarding : formalizes
  PropertyOnboarding ||--o| Contract : issues
  StayProposalRequest ||--o| StayProposal : converts_to
  OpsCase ||--o| StayProposal : formalizes
  StayProposal ||--o{ StayProposalVersion : versions
```

## Principios

- El Codigo de Estancia localiza una propiedad/unidad publica, pero no es una credencial de seguridad.
- El ledger financiero debe ser append-only.
- `OwnerSettlement` es una proyeccion por periodo para el propietario; sus lineas referencian ledger/reservas sin sustituir el libro mayor.
- `ContractVersion` conserva el snapshot emitido; la aceptacion owner escribe evidencia y no reescribe versiones firmadas.
- La participaciÃƒÂ³n de propietario/KUQUBA debe vivir en contrato o configuraciÃƒÂ³n, no en cÃƒÂ³digo.
- El dominio no debe depender directamente de proveedores de pagos, OTA, FEL, WhatsApp o storage.
- `OpsCase` concentra seguimiento interno y no sustituye las entidades publicas de origen.
- `PropertyOnboarding` y `StayProposal` son flujos formales creados desde ops, no formularios publicos.
- `StayQuote` calcula disponibilidad y tarifa sin bloquear inventario; un hold temporal crea `Reservation(HOLD)` hasta pago o confirmacion.
- `Payment` registra adapter, referencia, estado y expiracion del checkout; la confirmacion genera ledger base sin acoplar el dominio a un proveedor real.
- `HousekeepingTask` y `MaintenanceTicket` separan operacion en campo de tareas comerciales/owner; sus cambios de estado se auditan desde Ops.
