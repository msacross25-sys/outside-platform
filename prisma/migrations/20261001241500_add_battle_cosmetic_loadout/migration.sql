CREATE TABLE "BattleCosmeticSelection" (
  "userId" TEXT NOT NULL,
  "frameKey" TEXT,
  "nameEffectKey" TEXT,
  "entranceKey" TEXT,
  "victoryKey" TEXT,
  "emojiKey" TEXT,
  "giftEffectKey" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BattleCosmeticSelection_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "BattleCosmeticSelection"
  ADD CONSTRAINT "BattleCosmeticSelection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
