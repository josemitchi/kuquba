ALTER TABLE "TaxRule"
  ADD COLUMN "propertyId" TEXT,
  ADD COLUMN "unitId" TEXT;

CREATE INDEX "TaxRule_propertyId_unitId_active_idx" ON "TaxRule"("propertyId", "unitId", "active");

ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;