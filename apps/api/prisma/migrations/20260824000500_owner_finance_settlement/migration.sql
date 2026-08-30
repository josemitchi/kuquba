CREATE TYPE "OwnerSettlementStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'PAID');

CREATE TABLE "OwnerSettlement" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "OwnerSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL,
    "grossAccommodation" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cleaningFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "kuqubaServiceFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ownerExpenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ownerPayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnerSettlementLine" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "ledgerEntryId" TEXT,
    "reservationId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceMemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerSettlementLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OwnerSettlement_ownerId_periodStart_periodEnd_idx" ON "OwnerSettlement"("ownerId", "periodStart", "periodEnd");
CREATE INDEX "OwnerSettlement_propertyId_periodStart_idx" ON "OwnerSettlement"("propertyId", "periodStart");
CREATE INDEX "OwnerSettlement_status_periodEnd_idx" ON "OwnerSettlement"("status", "periodEnd");
CREATE INDEX "OwnerSettlementLine_settlementId_occurredAt_idx" ON "OwnerSettlementLine"("settlementId", "occurredAt");
CREATE INDEX "OwnerSettlementLine_ledgerEntryId_idx" ON "OwnerSettlementLine"("ledgerEntryId");
CREATE INDEX "OwnerSettlementLine_reservationId_idx" ON "OwnerSettlementLine"("reservationId");
CREATE INDEX "OwnerSettlementLine_type_occurredAt_idx" ON "OwnerSettlementLine"("type", "occurredAt");

ALTER TABLE "OwnerSettlement" ADD CONSTRAINT "OwnerSettlement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnerSettlement" ADD CONSTRAINT "OwnerSettlement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerSettlementLine" ADD CONSTRAINT "OwnerSettlementLine_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "OwnerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnerSettlementLine" ADD CONSTRAINT "OwnerSettlementLine_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerSettlementLine" ADD CONSTRAINT "OwnerSettlementLine_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;