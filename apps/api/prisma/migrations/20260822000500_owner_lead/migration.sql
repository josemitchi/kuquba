CREATE TYPE "OwnerLeadStatus" AS ENUM ('NEW', 'REVIEWING', 'CONTACTED', 'CLOSED');

CREATE TABLE "OwnerLead" (
    "id" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "propertyName" TEXT,
    "propertyType" TEXT NOT NULL,
    "propertyLocation" TEXT NOT NULL,
    "operatingStatus" TEXT NOT NULL,
    "message" TEXT,
    "status" "OwnerLeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'public_owner_evaluate',
    "correlationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OwnerLead_email_createdAt_idx" ON "OwnerLead"("email", "createdAt");
CREATE INDEX "OwnerLead_status_createdAt_idx" ON "OwnerLead"("status", "createdAt");
CREATE INDEX "OwnerLead_correlationId_idx" ON "OwnerLead"("correlationId");
