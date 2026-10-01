-- CreateEnum
CREATE TYPE "CoinPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'CHARGEBACK', 'FAILED');

-- AlterTable
ALTER TABLE "HostApplication"
ADD COLUMN "payoutProvider" TEXT,
ADD COLUMN "payoutProviderRef" TEXT,
ADD COLUMN "payoutOnboardingCompleteAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CoinPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSessionId" TEXT,
    "providerPaymentId" TEXT,
    "providerChargeId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "coins" BIGINT NOT NULL,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "reversedCoins" BIGINT NOT NULL DEFAULT 0,
    "status" "CoinPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostApplication_payoutProviderRef_key" ON "HostApplication"("payoutProviderRef");

-- CreateIndex
CREATE UNIQUE INDEX "CoinPurchase_providerSessionId_key" ON "CoinPurchase"("providerSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CoinPurchase_providerPaymentId_key" ON "CoinPurchase"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CoinPurchase_providerChargeId_key" ON "CoinPurchase"("providerChargeId");

-- CreateIndex
CREATE INDEX "CoinPurchase_userId_createdAt_idx" ON "CoinPurchase"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoinPurchase_status_createdAt_idx" ON "CoinPurchase"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CoinPurchase" ADD CONSTRAINT "CoinPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
