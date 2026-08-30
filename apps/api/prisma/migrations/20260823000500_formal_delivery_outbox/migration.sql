ALTER TABLE "OpsFormalDelivery" ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "acceptedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "OpsFormalDelivery_idempotencyKey_key" ON "OpsFormalDelivery"("idempotencyKey");
CREATE INDEX "OpsFormalDelivery_status_nextAttemptAt_idx" ON "OpsFormalDelivery"("status", "nextAttemptAt");