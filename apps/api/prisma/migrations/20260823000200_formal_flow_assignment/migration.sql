ALTER TABLE "PropertyOnboarding" ADD COLUMN "assignedUserId" TEXT,
ADD COLUMN "targetDate" TIMESTAMP(3),
ADD COLUMN "handoffNotes" TEXT;

ALTER TABLE "StayProposal" ADD COLUMN "assignedUserId" TEXT,
ADD COLUMN "targetDate" TIMESTAMP(3),
ADD COLUMN "handoffNotes" TEXT;

CREATE TABLE "OpsFormalActivity" (
    "id" TEXT NOT NULL,
    "opsCaseId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsFormalActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyOnboarding_assignedUserId_idx" ON "PropertyOnboarding"("assignedUserId");
CREATE INDEX "PropertyOnboarding_targetDate_idx" ON "PropertyOnboarding"("targetDate");
CREATE INDEX "StayProposal_assignedUserId_idx" ON "StayProposal"("assignedUserId");
CREATE INDEX "StayProposal_targetDate_idx" ON "StayProposal"("targetDate");
CREATE INDEX "OpsFormalActivity_opsCaseId_createdAt_idx" ON "OpsFormalActivity"("opsCaseId", "createdAt");
CREATE INDEX "OpsFormalActivity_entityType_entityId_createdAt_idx" ON "OpsFormalActivity"("entityType", "entityId", "createdAt");
CREATE INDEX "OpsFormalActivity_actorUserId_idx" ON "OpsFormalActivity"("actorUserId");

ALTER TABLE "PropertyOnboarding" ADD CONSTRAINT "PropertyOnboarding_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StayProposal" ADD CONSTRAINT "StayProposal_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpsFormalActivity" ADD CONSTRAINT "OpsFormalActivity_opsCaseId_fkey" FOREIGN KEY ("opsCaseId") REFERENCES "OpsCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpsFormalActivity" ADD CONSTRAINT "OpsFormalActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;