ALTER TABLE "BattleEarning" ALTER COLUMN "battleId" DROP NOT NULL;

ALTER TABLE "BattleEarning" DROP CONSTRAINT IF EXISTS "BattleEarning_battleId_fkey";

ALTER TABLE "BattleEarning"
  ADD CONSTRAINT "BattleEarning_battleId_fkey"
  FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
