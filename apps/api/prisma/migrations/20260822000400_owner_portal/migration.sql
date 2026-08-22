CREATE TABLE "OwnerTask" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
    "dueLabel" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "ownerAction" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnerDocument" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "label" TEXT NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OwnerTask_ownerId_status_sortOrder_idx" ON "OwnerTask"("ownerId", "status", "sortOrder");
CREATE INDEX "OwnerTask_propertyId_status_idx" ON "OwnerTask"("propertyId", "status");
CREATE INDEX "OwnerDocument_ownerId_sortOrder_idx" ON "OwnerDocument"("ownerId", "sortOrder");
CREATE INDEX "OwnerDocument_propertyId_idx" ON "OwnerDocument"("propertyId");

ALTER TABLE "OwnerTask" ADD CONSTRAINT "OwnerTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnerTask" ADD CONSTRAINT "OwnerTask_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerDocument" ADD CONSTRAINT "OwnerDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnerDocument" ADD CONSTRAINT "OwnerDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
