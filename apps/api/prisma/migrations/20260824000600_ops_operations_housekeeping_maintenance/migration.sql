CREATE TYPE "HousekeepingTaskStatus" AS ENUM ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED');
CREATE TYPE "MaintenanceTicketStatus" AS ENUM ('OPEN', 'TRIAGED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "MaintenanceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "HousekeepingTask" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "reservationId" TEXT,
    "title" TEXT NOT NULL,
    "status" "HousekeepingTaskStatus" NOT NULL DEFAULT 'SCHEDULED',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "serviceWindow" TEXT,
    "assigneeName" TEXT,
    "vendorName" TEXT,
    "checklist" JSONB NOT NULL,
    "notes" TEXT,
    "blockedReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceTicket" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "MaintenanceSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceTicketStatus" NOT NULL DEFAULT 'OPEN',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "assigneeName" TEXT,
    "vendorName" TEXT,
    "description" TEXT NOT NULL,
    "resolutionNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HousekeepingTask_propertyId_status_serviceDate_idx" ON "HousekeepingTask"("propertyId", "status", "serviceDate");
CREATE INDEX "HousekeepingTask_unitId_serviceDate_idx" ON "HousekeepingTask"("unitId", "serviceDate");
CREATE INDEX "HousekeepingTask_reservationId_idx" ON "HousekeepingTask"("reservationId");
CREATE INDEX "HousekeepingTask_status_serviceDate_idx" ON "HousekeepingTask"("status", "serviceDate");
CREATE INDEX "MaintenanceTicket_propertyId_status_dueAt_idx" ON "MaintenanceTicket"("propertyId", "status", "dueAt");
CREATE INDEX "MaintenanceTicket_unitId_status_idx" ON "MaintenanceTicket"("unitId", "status");
CREATE INDEX "MaintenanceTicket_severity_status_idx" ON "MaintenanceTicket"("severity", "status");
CREATE INDEX "MaintenanceTicket_status_reportedAt_idx" ON "MaintenanceTicket"("status", "reportedAt");

ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;