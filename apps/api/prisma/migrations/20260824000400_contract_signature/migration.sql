CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ISSUED', 'SIGNED', 'ACTIVE', 'VOID', 'SUPERSEDED');

ALTER TABLE "Contract"
ADD COLUMN "propertyOnboardingId" TEXT,
ADD COLUMN "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "title" TEXT,
ADD COLUMN "summary" TEXT,
ADD COLUMN "termsSnapshot" JSONB,
ADD COLUMN "issuedAt" TIMESTAMP(3),
ADD COLUMN "issuedByUserId" TEXT,
ADD COLUMN "signedAt" TIMESTAMP(3),
ADD COLUMN "signedByUserId" TEXT,
ADD COLUMN "signatureProvider" TEXT,
ADD COLUMN "signatureProviderRef" TEXT,
ADD COLUMN "signatureEvidenceHash" TEXT;

ALTER TABLE "Contract" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TABLE "ContractVersion" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "termsSnapshot" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),

    CONSTRAINT "ContractVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contract_propertyOnboardingId_key" ON "Contract"("propertyOnboardingId");
CREATE UNIQUE INDEX "Contract_signatureProviderRef_key" ON "Contract"("signatureProviderRef");
CREATE INDEX "Contract_status_startsOn_idx" ON "Contract"("status", "startsOn");
CREATE INDEX "Contract_propertyOnboardingId_idx" ON "Contract"("propertyOnboardingId");
CREATE UNIQUE INDEX "ContractVersion_contractId_version_key" ON "ContractVersion"("contractId", "version");
CREATE INDEX "ContractVersion_contractId_createdAt_idx" ON "ContractVersion"("contractId", "createdAt");
CREATE INDEX "ContractVersion_createdByUserId_idx" ON "ContractVersion"("createdByUserId");

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_propertyOnboardingId_fkey" FOREIGN KEY ("propertyOnboardingId") REFERENCES "PropertyOnboarding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;