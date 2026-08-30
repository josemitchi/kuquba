CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

ALTER TABLE "Payment"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCEEDED',
ADD COLUMN "checkoutUrl" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_reservationId_status_idx" ON "Payment"("reservationId", "status");
CREATE INDEX "Payment_status_expiresAt_idx" ON "Payment"("status", "expiresAt");