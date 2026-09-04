ALTER TABLE "AuthChallenge"
ADD COLUMN "codeHash" TEXT,
ADD COLUMN "deliveryProvider" TEXT,
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "deliveryError" TEXT;