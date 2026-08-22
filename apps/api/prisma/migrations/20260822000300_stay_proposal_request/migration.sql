-- CreateEnum
CREATE TYPE "StayProposalRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'CONTACTED', 'CLOSED');

-- CreateTable
CREATE TABLE "StayProposalRequest" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "stayName" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "departureDate" TIMESTAMP(3),
    "guests" INTEGER NOT NULL,
    "message" TEXT,
    "status" "StayProposalRequestStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'public_stay_detail',
    "correlationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayProposalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StayProposalRequest_stayId_status_createdAt_idx" ON "StayProposalRequest"("stayId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StayProposalRequest_email_createdAt_idx" ON "StayProposalRequest"("email", "createdAt");

-- CreateIndex
CREATE INDEX "StayProposalRequest_correlationId_idx" ON "StayProposalRequest"("correlationId");
