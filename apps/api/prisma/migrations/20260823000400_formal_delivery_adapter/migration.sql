CREATE TYPE "FormalDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

ALTER TABLE "PropertyOnboarding" ADD COLUMN "deliveryStatus" "FormalDeliveryStatus",
ADD COLUMN "deliveryProvider" TEXT,
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "deliveryChannel" TEXT,
ADD COLUMN "deliveryTemplateKey" TEXT,
ADD COLUMN "deliveryTemplateVersion" INTEGER,
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "deliveryFailedAt" TIMESTAMP(3),
ADD COLUMN "deliveryErrorCode" TEXT,
ADD COLUMN "deliveryErrorMessage" TEXT;

ALTER TABLE "StayProposal" ADD COLUMN "deliveryStatus" "FormalDeliveryStatus",
ADD COLUMN "deliveryProvider" TEXT,
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "deliveryChannel" TEXT,
ADD COLUMN "deliveryTemplateKey" TEXT,
ADD COLUMN "deliveryTemplateVersion" INTEGER,
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "deliveryFailedAt" TIMESTAMP(3),
ADD COLUMN "deliveryErrorCode" TEXT,
ADD COLUMN "deliveryErrorMessage" TEXT;

CREATE TABLE "OpsFormalDelivery" (
  "id" TEXT NOT NULL,
  "opsCaseId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "templateKey" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "status" "FormalDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "recipientHash" TEXT NOT NULL,
  "recipientMasked" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),

  CONSTRAINT "OpsFormalDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyOnboarding_deliveryStatus_updatedAt_idx" ON "PropertyOnboarding"("deliveryStatus", "updatedAt");
CREATE INDEX "PropertyOnboarding_providerMessageId_idx" ON "PropertyOnboarding"("providerMessageId");
CREATE INDEX "StayProposal_deliveryStatus_updatedAt_idx" ON "StayProposal"("deliveryStatus", "updatedAt");
CREATE INDEX "StayProposal_providerMessageId_idx" ON "StayProposal"("providerMessageId");
CREATE INDEX "OpsFormalDelivery_opsCaseId_createdAt_idx" ON "OpsFormalDelivery"("opsCaseId", "createdAt");
CREATE INDEX "OpsFormalDelivery_entityType_entityId_createdAt_idx" ON "OpsFormalDelivery"("entityType", "entityId", "createdAt");
CREATE INDEX "OpsFormalDelivery_providerMessageId_idx" ON "OpsFormalDelivery"("providerMessageId");
CREATE INDEX "OpsFormalDelivery_status_createdAt_idx" ON "OpsFormalDelivery"("status", "createdAt");
CREATE INDEX "OpsFormalDelivery_actorUserId_idx" ON "OpsFormalDelivery"("actorUserId");

ALTER TABLE "OpsFormalDelivery" ADD CONSTRAINT "OpsFormalDelivery_opsCaseId_fkey" FOREIGN KEY ("opsCaseId") REFERENCES "OpsCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpsFormalDelivery" ADD CONSTRAINT "OpsFormalDelivery_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;