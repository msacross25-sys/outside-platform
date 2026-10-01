CREATE TABLE "BattleGuild" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "regionCode" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BattleGuild_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattleGuildMember" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BattleGuildMember_pkey" PRIMARY KEY ("guildId","userId")
);

CREATE TABLE "BattleTerritory" (
  "id" TEXT NOT NULL,
  "regionCode" TEXT NOT NULL,
  "holderGuildId" TEXT,
  "seasonKey" TEXT NOT NULL,
  "heldSince" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BattleTerritory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattleTerritoryScore" (
  "guildId" TEXT NOT NULL,
  "territoryId" TEXT NOT NULL,
  "seasonKey" TEXT NOT NULL,
  "points" BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BattleTerritoryScore_pkey" PRIMARY KEY ("guildId","territoryId","seasonKey")
);

CREATE UNIQUE INDEX "BattleGuild_slug_key" ON "BattleGuild"("slug");
CREATE INDEX "BattleGuild_ownerId_idx" ON "BattleGuild"("ownerId");
CREATE INDEX "BattleGuild_regionCode_idx" ON "BattleGuild"("regionCode");
CREATE INDEX "BattleGuildMember_userId_idx" ON "BattleGuildMember"("userId");
CREATE UNIQUE INDEX "BattleTerritory_regionCode_key" ON "BattleTerritory"("regionCode");
CREATE INDEX "BattleTerritory_holderGuildId_idx" ON "BattleTerritory"("holderGuildId");
CREATE INDEX "BattleTerritory_seasonKey_idx" ON "BattleTerritory"("seasonKey");
CREATE INDEX "BattleTerritoryScore_territoryId_seasonKey_points_idx" ON "BattleTerritoryScore"("territoryId","seasonKey","points");

ALTER TABLE "BattleGuild"
  ADD CONSTRAINT "BattleGuild_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleGuildMember"
  ADD CONSTRAINT "BattleGuildMember_guildId_fkey"
  FOREIGN KEY ("guildId") REFERENCES "BattleGuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleGuildMember"
  ADD CONSTRAINT "BattleGuildMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleTerritory"
  ADD CONSTRAINT "BattleTerritory_holderGuildId_fkey"
  FOREIGN KEY ("holderGuildId") REFERENCES "BattleGuild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BattleTerritoryScore"
  ADD CONSTRAINT "BattleTerritoryScore_guildId_fkey"
  FOREIGN KEY ("guildId") REFERENCES "BattleGuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleTerritoryScore"
  ADD CONSTRAINT "BattleTerritoryScore_territoryId_fkey"
  FOREIGN KEY ("territoryId") REFERENCES "BattleTerritory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
