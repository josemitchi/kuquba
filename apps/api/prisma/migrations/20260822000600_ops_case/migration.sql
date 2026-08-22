CREATE TYPE "OpsCaseSourceType" AS ENUM ('OWNER_LEAD', 'STAY_PROPOSAL_REQUEST');
CREATE TYPE "OpsCaseStatus" AS ENUM ('OPEN', 'QUALIFYING', 'ACTION_PENDING', 'CLOSED');
CREATE TYPE "OpsTaskStatus" AS ENUM ('OPEN', 'DONE');

CREATE TABLE "OpsCase" (
    "id" TEXT NOT NULL,
    "sourceType" "OpsCaseSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "OpsCaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "nextStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpsCaseNote" (
    "id" TEXT NOT NULL,
    "opsCaseId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsCaseNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpsCaseTask" (
    "id" TEXT NOT NULL,
    "opsCaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueLabel" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" "OpsTaskStatus" NOT NULL DEFAULT 'OPEN',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsCaseTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpsCase_sourceType_sourceId_key" ON "OpsCase"("sourceType", "sourceId");
CREATE INDEX "OpsCase_status_updatedAt_idx" ON "OpsCase"("status", "updatedAt");
CREATE INDEX "OpsCase_sourceType_updatedAt_idx" ON "OpsCase"("sourceType", "updatedAt");
CREATE INDEX "OpsCaseNote_opsCaseId_createdAt_idx" ON "OpsCaseNote"("opsCaseId", "createdAt");
CREATE INDEX "OpsCaseNote_authorUserId_idx" ON "OpsCaseNote"("authorUserId");
CREATE INDEX "OpsCaseTask_opsCaseId_status_sortOrder_idx" ON "OpsCaseTask"("opsCaseId", "status", "sortOrder");

ALTER TABLE "OpsCaseNote" ADD CONSTRAINT "OpsCaseNote_opsCaseId_fkey" FOREIGN KEY ("opsCaseId") REFERENCES "OpsCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpsCaseNote" ADD CONSTRAINT "OpsCaseNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpsCaseTask" ADD CONSTRAINT "OpsCaseTask_opsCaseId_fkey" FOREIGN KEY ("opsCaseId") REFERENCES "OpsCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;