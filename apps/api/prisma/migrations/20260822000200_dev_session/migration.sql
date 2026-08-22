-- CreateTable
CREATE TABLE "DevSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevSession_sessionTokenHash_key" ON "DevSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "DevSession_userId_audience_expiresAt_idx" ON "DevSession"("userId", "audience", "expiresAt");

-- CreateIndex
CREATE INDEX "DevSession_correlationId_idx" ON "DevSession"("correlationId");

-- AddForeignKey
ALTER TABLE "DevSession" ADD CONSTRAINT "DevSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
