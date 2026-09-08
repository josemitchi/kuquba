ALTER TABLE "Reservation"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "privacyVersion" TEXT,
  ADD COLUMN "stayRulesAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "stayRulesVersion" TEXT,
  ADD COLUMN "acceptedIpAddress" TEXT,
  ADD COLUMN "acceptedUserAgent" TEXT;