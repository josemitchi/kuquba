CREATE TYPE "PropertyOnboardingStatus" AS ENUM ('DRAFT', 'QUALIFICATION', 'DOCUMENTS', 'OPERATIONS_READY', 'CLOSED');
CREATE TYPE "StayProposalStatus" AS ENUM ('DRAFT', 'READY_TO_SEND', 'SENT', 'ACCEPTED', 'DECLINED', 'VOID');

CREATE TABLE "PropertyOnboarding" (
    "id" TEXT NOT NULL,
    "opsCaseId" TEXT NOT NULL,
    "ownerLeadId" TEXT NOT NULL,
    "candidatePropertyName" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "propertyLocation" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "status" "PropertyOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "nextMilestone" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StayProposal" (
    "id" TEXT NOT NULL,
    "opsCaseId" TEXT NOT NULL,
    "proposalRequestId" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "stayName" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "departureDate" TIMESTAMP(3),
    "guests" INTEGER NOT NULL,
    "status" "StayProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StayProposalVersion" (
    "id" TEXT NOT NULL,
    "stayProposalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "termsLabel" TEXT NOT NULL,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StayProposalVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyOnboarding_opsCaseId_key" ON "PropertyOnboarding"("opsCaseId");
CREATE UNIQUE INDEX "PropertyOnboarding_ownerLeadId_key" ON "PropertyOnboarding"("ownerLeadId");
CREATE INDEX "PropertyOnboarding_status_updatedAt_idx" ON "PropertyOnboarding"("status", "updatedAt");
CREATE INDEX "PropertyOnboarding_propertyLocation_idx" ON "PropertyOnboarding"("propertyLocation");

CREATE UNIQUE INDEX "StayProposal_opsCaseId_key" ON "StayProposal"("opsCaseId");
CREATE UNIQUE INDEX "StayProposal_proposalRequestId_key" ON "StayProposal"("proposalRequestId");
CREATE INDEX "StayProposal_status_updatedAt_idx" ON "StayProposal"("status", "updatedAt");
CREATE INDEX "StayProposal_stayId_status_idx" ON "StayProposal"("stayId", "status");

CREATE UNIQUE INDEX "StayProposalVersion_stayProposalId_version_key" ON "StayProposalVersion"("stayProposalId", "version");
CREATE INDEX "StayProposalVersion_stayProposalId_createdAt_idx" ON "StayProposalVersion"("stayProposalId", "createdAt");

ALTER TABLE "PropertyOnboarding" ADD CONSTRAINT "PropertyOnboarding_opsCaseId_fkey" FOREIGN KEY ("opsCaseId") REFERENCES "OpsCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyOnboarding" ADD CONSTRAINT "PropertyOnboarding_ownerLeadId_fkey" FOREIGN KEY ("ownerLeadId") REFERENCES "OwnerLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StayProposal" ADD CONSTRAINT "StayProposal_opsCaseId_fkey" FOREIGN KEY ("opsCaseId") REFERENCES "OpsCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StayProposal" ADD CONSTRAINT "StayProposal_proposalRequestId_fkey" FOREIGN KEY ("proposalRequestId") REFERENCES "StayProposalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StayProposalVersion" ADD CONSTRAINT "StayProposalVersion_stayProposalId_fkey" FOREIGN KEY ("stayProposalId") REFERENCES "StayProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;