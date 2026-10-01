-- Expand OUTSiiDE battles into a durable economy, ranking, tournament and reward system.

ALTER TABLE "User" ADD COLUMN "regionCode" TEXT;

ALTER TABLE "GiftTransaction"
  ADD COLUMN "battleId" TEXT,
  ADD COLUMN "battleSide" INTEGER,
  ADD COLUMN "battlePoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "battleMultiplier" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "battleRewardPoolCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "referralRewardCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Battle"
  ADD COLUMN "tournamentId" TEXT,
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'ONE_V_ONE',
  ADD COLUMN "surgeSeconds" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "surgeMultiplier" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "winnerSide" INTEGER,
  ADD COLUMN "totalGiftValueCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "creatorPoolCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "platformRevenueCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rewardPoolCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "referralReserveCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "roundNumber" INTEGER,
  ADD COLUMN "matchNumber" INTEGER,
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "featuredUntil" TIMESTAMP(3);

ALTER TABLE "BattleTeam"
  ADD COLUMN "basePoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "surgePoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "giftValueCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "BattleProfile" (
  "userId" TEXT NOT NULL,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "ties" INTEGER NOT NULL DEFAULT 0,
  "currentWinStreak" INTEGER NOT NULL DEFAULT 0,
  "bestWinStreak" INTEGER NOT NULL DEFAULT 0,
  "rankingPoints" BIGINT NOT NULL DEFAULT 0,
  "lifetimeBattlePoints" BIGINT NOT NULL DEFAULT 0,
  "lifetimeGiftValueCents" BIGINT NOT NULL DEFAULT 0,
  "rankTitle" TEXT NOT NULL DEFAULT 'BRONZE',
  "featuredUntil" TIMESTAMP(3),
  "recommendedUntil" TIMESTAMP(3),
  "hallOfFame" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BattleProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "BattleParticipantResult" (
  "id" TEXT NOT NULL,
  "battleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "side" INTEGER NOT NULL,
  "won" BOOLEAN NOT NULL DEFAULT false,
  "tied" BOOLEAN NOT NULL DEFAULT false,
  "battlePoints" INTEGER NOT NULL DEFAULT 0,
  "rankingPoints" INTEGER NOT NULL DEFAULT 0,
  "regionCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BattleParticipantResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattleEarning" (
  "id" TEXT NOT NULL,
  "battleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "giftTransactionId" TEXT,
  "kind" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "LedgerStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  CONSTRAINT "BattleEarning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattleTournament" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REGISTRATION',
  "bracketSize" INTEGER NOT NULL,
  "currentRound" INTEGER NOT NULL DEFAULT 1,
  "prizePoolCents" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BattleTournament_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattleTournamentEntry" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seed" INTEGER,
  "eliminated" BOOLEAN NOT NULL DEFAULT false,
  "placement" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BattleTournamentEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattlePassProgress" (
  "userId" TEXT NOT NULL,
  "seasonKey" TEXT NOT NULL,
  "freeXp" INTEGER NOT NULL DEFAULT 0,
  "premiumXp" INTEGER NOT NULL DEFAULT 0,
  "premiumActive" BOOLEAN NOT NULL DEFAULT false,
  "level" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BattlePassProgress_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "BattleRewardLedger" (
  "id" TEXT NOT NULL,
  "battleId" TEXT,
  "userId" TEXT,
  "kind" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CASH_CENTS',
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "metadataJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BattleRewardLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BattleParticipantResult_battleId_userId_key" ON "BattleParticipantResult"("battleId","userId");
CREATE UNIQUE INDEX "BattleTournamentEntry_tournamentId_userId_key" ON "BattleTournamentEntry"("tournamentId","userId");

CREATE INDEX "GiftTransaction_battleId_createdAt_idx" ON "GiftTransaction"("battleId","createdAt");
CREATE INDEX "Battle_tournamentId_roundNumber_matchNumber_idx" ON "Battle"("tournamentId","roundNumber","matchNumber");
CREATE INDEX "Battle_status_createdAt_idx" ON "Battle"("status","createdAt");
CREATE INDEX "BattleProfile_rankingPoints_idx" ON "BattleProfile"("rankingPoints");
CREATE INDEX "BattleProfile_rankTitle_rankingPoints_idx" ON "BattleProfile"("rankTitle","rankingPoints");
CREATE INDEX "BattleParticipantResult_userId_createdAt_idx" ON "BattleParticipantResult"("userId","createdAt");
CREATE INDEX "BattleParticipantResult_createdAt_rankingPoints_idx" ON "BattleParticipantResult"("createdAt","rankingPoints");
CREATE INDEX "BattleParticipantResult_regionCode_createdAt_rankingPoints_idx" ON "BattleParticipantResult"("regionCode","createdAt","rankingPoints");
CREATE INDEX "BattleEarning_userId_status_createdAt_idx" ON "BattleEarning"("userId","status","createdAt");
CREATE INDEX "BattleEarning_battleId_createdAt_idx" ON "BattleEarning"("battleId","createdAt");
CREATE INDEX "BattleEarning_giftTransactionId_idx" ON "BattleEarning"("giftTransactionId");
CREATE INDEX "BattleTournament_status_startsAt_idx" ON "BattleTournament"("status","startsAt");
CREATE INDEX "BattleTournamentEntry_tournamentId_eliminated_seed_idx" ON "BattleTournamentEntry"("tournamentId","eliminated","seed");
CREATE INDEX "BattleTournamentEntry_userId_createdAt_idx" ON "BattleTournamentEntry"("userId","createdAt");
CREATE INDEX "BattlePassProgress_seasonKey_level_idx" ON "BattlePassProgress"("seasonKey","level");
CREATE INDEX "BattleRewardLedger_battleId_createdAt_idx" ON "BattleRewardLedger"("battleId","createdAt");
CREATE INDEX "BattleRewardLedger_userId_createdAt_idx" ON "BattleRewardLedger"("userId","createdAt");
CREATE INDEX "BattleRewardLedger_status_createdAt_idx" ON "BattleRewardLedger"("status","createdAt");

ALTER TABLE "Battle"
  ADD CONSTRAINT "Battle_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "BattleTournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BattleProfile"
  ADD CONSTRAINT "BattleProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleParticipantResult"
  ADD CONSTRAINT "BattleParticipantResult_battleId_fkey"
  FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleParticipantResult"
  ADD CONSTRAINT "BattleParticipantResult_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleEarning"
  ADD CONSTRAINT "BattleEarning_battleId_fkey"
  FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleEarning"
  ADD CONSTRAINT "BattleEarning_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BattleTournamentEntry"
  ADD CONSTRAINT "BattleTournamentEntry_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "BattleTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleTournamentEntry"
  ADD CONSTRAINT "BattleTournamentEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
