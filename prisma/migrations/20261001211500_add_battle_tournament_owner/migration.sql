ALTER TABLE "BattleTournament" ADD COLUMN "ownerId" TEXT;

UPDATE "BattleTournament"
SET "ownerId" = (
  SELECT "userId"
  FROM "HostApplication"
  WHERE "status" = 'APPROVED'
  ORDER BY "appliedAt" ASC
  LIMIT 1
)
WHERE "ownerId" IS NULL;

DELETE FROM "BattleTournament" WHERE "ownerId" IS NULL;

ALTER TABLE "BattleTournament" ALTER COLUMN "ownerId" SET NOT NULL;

CREATE INDEX "BattleTournament_ownerId_createdAt_idx" ON "BattleTournament"("ownerId","createdAt");

ALTER TABLE "BattleTournament"
  ADD CONSTRAINT "BattleTournament_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
