CREATE TYPE "FormalApprovalStatus" AS ENUM ('DRAFT', 'READY_FOR_APPROVAL', 'APPROVED', 'SENT');

ALTER TABLE "PropertyOnboarding" ADD COLUMN "approvalStatus" "FormalApprovalStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedByUserId" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "sentByUserId" TEXT,
ADD COLUMN "deliveryNotes" TEXT;

ALTER TABLE "StayProposal" ADD COLUMN "approvalStatus" "FormalApprovalStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedByUserId" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "sentByUserId" TEXT,
ADD COLUMN "deliveryNotes" TEXT;

CREATE INDEX "PropertyOnboarding_approvalStatus_updatedAt_idx" ON "PropertyOnboarding"("approvalStatus", "updatedAt");
CREATE INDEX "PropertyOnboarding_approvedByUserId_idx" ON "PropertyOnboarding"("approvedByUserId");
CREATE INDEX "PropertyOnboarding_sentByUserId_idx" ON "PropertyOnboarding"("sentByUserId");
CREATE INDEX "StayProposal_approvalStatus_updatedAt_idx" ON "StayProposal"("approvalStatus", "updatedAt");
CREATE INDEX "StayProposal_approvedByUserId_idx" ON "StayProposal"("approvedByUserId");
CREATE INDEX "StayProposal_sentByUserId_idx" ON "StayProposal"("sentByUserId");

ALTER TABLE "PropertyOnboarding" ADD CONSTRAINT "PropertyOnboarding_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PropertyOnboarding" ADD CONSTRAINT "PropertyOnboarding_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StayProposal" ADD CONSTRAINT "StayProposal_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StayProposal" ADD CONSTRAINT "StayProposal_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;