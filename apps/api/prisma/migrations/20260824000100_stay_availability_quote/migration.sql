CREATE TYPE "AvailabilityBlockReason" AS ENUM ('OWNER_HOLD', 'MAINTENANCE', 'OPS_HOLD');
CREATE TYPE "StayQuoteStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

ALTER TABLE "StayCode" ADD COLUMN "unitId" TEXT;

CREATE TABLE "AvailabilityBlock" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "startsOn" TIMESTAMP(3) NOT NULL,
  "endsOn" TIMESTAMP(3) NOT NULL,
  "reason" "AvailabilityBlockReason" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RatePlan" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GTQ',
  "baseNightlyRate" DECIMAL(12,2) NOT NULL,
  "weekendNightlyRate" DECIMAL(12,2),
  "cleaningFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "serviceFeeBps" INTEGER NOT NULL DEFAULT 0,
  "taxBps" INTEGER NOT NULL DEFAULT 0,
  "minNights" INTEGER NOT NULL DEFAULT 1,
  "startsOn" TIMESTAMP(3),
  "endsOn" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StayQuote" (
  "id" TEXT NOT NULL,
  "stayId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "status" "StayQuoteStatus" NOT NULL,
  "unavailableReason" TEXT,
  "arrivalDate" TIMESTAMP(3) NOT NULL,
  "departureDate" TIMESTAMP(3) NOT NULL,
  "nights" INTEGER NOT NULL,
  "guests" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "nightlySubtotal" DECIMAL(12,2) NOT NULL,
  "cleaningFee" DECIMAL(12,2) NOT NULL,
  "serviceFee" DECIMAL(12,2) NOT NULL,
  "tax" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'public_stay_detail',
  "correlationId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StayQuote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StayCode_propertyId_active_idx" ON "StayCode"("propertyId", "active");
CREATE INDEX "StayCode_unitId_idx" ON "StayCode"("unitId");
CREATE INDEX "AvailabilityBlock_propertyId_startsOn_endsOn_idx" ON "AvailabilityBlock"("propertyId", "startsOn", "endsOn");
CREATE INDEX "AvailabilityBlock_unitId_startsOn_endsOn_idx" ON "AvailabilityBlock"("unitId", "startsOn", "endsOn");
CREATE INDEX "AvailabilityBlock_reason_startsOn_idx" ON "AvailabilityBlock"("reason", "startsOn");
CREATE INDEX "RatePlan_propertyId_active_idx" ON "RatePlan"("propertyId", "active");
CREATE INDEX "RatePlan_unitId_active_idx" ON "RatePlan"("unitId", "active");
CREATE INDEX "RatePlan_startsOn_endsOn_idx" ON "RatePlan"("startsOn", "endsOn");
CREATE INDEX "StayQuote_stayId_createdAt_idx" ON "StayQuote"("stayId", "createdAt");
CREATE INDEX "StayQuote_propertyId_arrivalDate_departureDate_idx" ON "StayQuote"("propertyId", "arrivalDate", "departureDate");
CREATE INDEX "StayQuote_unitId_arrivalDate_departureDate_idx" ON "StayQuote"("unitId", "arrivalDate", "departureDate");
CREATE INDEX "StayQuote_status_createdAt_idx" ON "StayQuote"("status", "createdAt");
CREATE INDEX "StayQuote_correlationId_idx" ON "StayQuote"("correlationId");

ALTER TABLE "StayCode" ADD CONSTRAINT "StayCode_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StayQuote" ADD CONSTRAINT "StayQuote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StayQuote" ADD CONSTRAINT "StayQuote_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
