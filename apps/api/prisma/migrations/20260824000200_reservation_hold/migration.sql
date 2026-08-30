ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Reservation" ADD COLUMN "stayQuoteId" TEXT,
ADD COLUMN "holdExpiresAt" TIMESTAMP(3),
ADD COLUMN "confirmationSource" TEXT,
ADD COLUMN "currency" TEXT,
ADD COLUMN "total" DECIMAL(12,2);

CREATE UNIQUE INDEX "Reservation_stayQuoteId_key" ON "Reservation"("stayQuoteId");
CREATE INDEX "Reservation_unitId_arrivalDate_departureDate_idx" ON "Reservation"("unitId", "arrivalDate", "departureDate");
CREATE INDEX "Reservation_guestId_status_arrivalDate_idx" ON "Reservation"("guestId", "status", "arrivalDate");
CREATE INDEX "Reservation_status_holdExpiresAt_idx" ON "Reservation"("status", "holdExpiresAt");

ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_stayQuoteId_fkey" FOREIGN KEY ("stayQuoteId") REFERENCES "StayQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
