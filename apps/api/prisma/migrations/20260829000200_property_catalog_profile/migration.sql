ALTER TABLE "Property" ADD COLUMN "neighborhood" TEXT;
ALTER TABLE "Property" ADD COLUMN "summary" TEXT;
ALTER TABLE "Property" ADD COLUMN "stayStyle" TEXT;
ALTER TABLE "Property" ADD COLUMN "bookingNote" TEXT;
ALTER TABLE "Property" ADD COLUMN "amenities" JSONB;
ALTER TABLE "Property" ADD COLUMN "houseRules" JSONB;
ALTER TABLE "Property" ADD COLUMN "operations" JSONB;