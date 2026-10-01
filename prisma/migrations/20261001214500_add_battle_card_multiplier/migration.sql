ALTER TABLE "BattleTeam"
  ADD COLUMN "activeMultiplier" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "multiplierExpiresAt" TIMESTAMP(3);
