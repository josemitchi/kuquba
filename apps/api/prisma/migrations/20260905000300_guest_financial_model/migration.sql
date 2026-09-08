CREATE TYPE "ChargeConceptCategory" AS ENUM ('ACCOMMODATION', 'SERVICE', 'DIGITAL_PLATFORM', 'PAYMENT_PROCESSING', 'TAX', 'DISCOUNT', 'ADJUSTMENT');
CREATE TYPE "ChargeCalculationMethod" AS ENUM ('FIXED', 'PER_NIGHT', 'PERCENTAGE', 'PASS_THROUGH');
CREATE TYPE "FinancialBeneficiaryType" AS ENUM ('OWNER', 'KUQUBA', 'PROVIDER', 'PAYMENT_PROCESSOR', 'TAX_AUTHORITY', 'GUEST');

ALTER TABLE "StayQuote" ADD COLUMN "financialSnapshot" JSONB;
ALTER TABLE "Reservation" ADD COLUMN "financialSnapshot" JSONB;

CREATE TABLE "ChargeDefinition" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "propertyId" TEXT,
  "unitId" TEXT,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "category" "ChargeConceptCategory" NOT NULL,
  "calculationMethod" "ChargeCalculationMethod" NOT NULL,
  "amount" DECIMAL(12,2),
  "rateBps" INTEGER,
  "taxable" BOOLEAN NOT NULL DEFAULT true,
  "guestVisible" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "distribution" JSONB,
  "metadata" JSONB,
  "startsOn" TIMESTAMP(3),
  "endsOn" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChargeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "rateBps" INTEGER NOT NULL,
  "appliesToCategories" JSONB,
  "appliesToChargeCodes" JSONB,
  "responsibleParty" "FinancialBeneficiaryType" NOT NULL DEFAULT 'TAX_AUTHORITY',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "startsOn" TIMESTAMP(3),
  "endsOn" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StayQuoteCharge" (
  "id" TEXT NOT NULL,
  "stayQuoteId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" "ChargeConceptCategory" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "taxable" BOOLEAN NOT NULL DEFAULT true,
  "guestVisible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StayQuoteCharge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReservationCharge" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "sourceQuoteChargeId" TEXT,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "category" "ChargeConceptCategory" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "taxable" BOOLEAN NOT NULL DEFAULT true,
  "guestVisible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReservationCharge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialAllocation" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "reservationChargeId" TEXT,
  "sourceChargeCode" TEXT,
  "beneficiaryType" "FinancialBeneficiaryType" NOT NULL,
  "beneficiaryRef" TEXT,
  "beneficiaryName" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "shareBps" INTEGER,
  "ledgerEntryType" "LedgerEntryType" NOT NULL,
  "settlementEligible" BOOLEAN NOT NULL DEFAULT false,
  "memo" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinancialAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChargeDefinition_organizationId_active_idx" ON "ChargeDefinition"("organizationId", "active");
CREATE INDEX "ChargeDefinition_propertyId_unitId_active_idx" ON "ChargeDefinition"("propertyId", "unitId", "active");
CREATE INDEX "ChargeDefinition_code_active_idx" ON "ChargeDefinition"("code", "active");
CREATE INDEX "ChargeDefinition_category_active_idx" ON "ChargeDefinition"("category", "active");

CREATE INDEX "TaxRule_organizationId_active_idx" ON "TaxRule"("organizationId", "active");
CREATE INDEX "TaxRule_code_active_idx" ON "TaxRule"("code", "active");

CREATE INDEX "StayQuoteCharge_stayQuoteId_sortOrder_idx" ON "StayQuoteCharge"("stayQuoteId", "sortOrder");
CREATE INDEX "StayQuoteCharge_code_idx" ON "StayQuoteCharge"("code");

CREATE INDEX "ReservationCharge_reservationId_sortOrder_idx" ON "ReservationCharge"("reservationId", "sortOrder");
CREATE INDEX "ReservationCharge_code_idx" ON "ReservationCharge"("code");

CREATE INDEX "FinancialAllocation_reservationId_beneficiaryType_idx" ON "FinancialAllocation"("reservationId", "beneficiaryType");
CREATE INDEX "FinancialAllocation_reservationChargeId_idx" ON "FinancialAllocation"("reservationChargeId");
CREATE INDEX "FinancialAllocation_ledgerEntryType_idx" ON "FinancialAllocation"("ledgerEntryType");

ALTER TABLE "ChargeDefinition" ADD CONSTRAINT "ChargeDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChargeDefinition" ADD CONSTRAINT "ChargeDefinition_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChargeDefinition" ADD CONSTRAINT "ChargeDefinition_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StayQuoteCharge" ADD CONSTRAINT "StayQuoteCharge_stayQuoteId_fkey" FOREIGN KEY ("stayQuoteId") REFERENCES "StayQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationCharge" ADD CONSTRAINT "ReservationCharge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_reservationChargeId_fkey" FOREIGN KEY ("reservationChargeId") REFERENCES "ReservationCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;