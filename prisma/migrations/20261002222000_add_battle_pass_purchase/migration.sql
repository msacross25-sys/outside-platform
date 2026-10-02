CREATE TABLE "BattlePassPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seasonKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSessionId" TEXT,
  "providerPaymentId" TEXT,
  "providerChargeId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "status" "CoinPurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BattlePassPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BattlePassPurchase_providerSessionId_key" ON "BattlePassPurchase"("providerSessionId");
CREATE UNIQUE INDEX "BattlePassPurchase_providerPaymentId_key" ON "BattlePassPurchase"("providerPaymentId");
CREATE UNIQUE INDEX "BattlePassPurchase_providerChargeId_key" ON "BattlePassPurchase"("providerChargeId");
CREATE UNIQUE INDEX "BattlePassPurchase_userId_seasonKey_key" ON "BattlePassPurchase"("userId","seasonKey");
CREATE INDEX "BattlePassPurchase_status_createdAt_idx" ON "BattlePassPurchase"("status","createdAt");

ALTER TABLE "BattlePassPurchase"
  ADD CONSTRAINT "BattlePassPurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BattlePassPurchase" ENABLE ROW LEVEL SECURITY;
