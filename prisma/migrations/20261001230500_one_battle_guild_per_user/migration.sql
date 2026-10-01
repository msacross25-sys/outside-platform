DROP INDEX IF EXISTS "BattleGuildMember_userId_idx";
CREATE UNIQUE INDEX "BattleGuildMember_userId_key" ON "BattleGuildMember"("userId");
