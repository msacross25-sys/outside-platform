-- CreateEnum
CREATE TYPE "ClipProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Clip"
  ADD COLUMN "processingStatus" "ClipProcessingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "processingError" TEXT,
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "readyAt" TIMESTAMP(3);

-- Backfill any clips that already have processed media.
UPDATE "Clip"
SET
  "processingStatus" = 'READY',
  "readyAt" = COALESCE("readyAt", "createdAt")
WHERE "mediaUrl" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Clip_processingStatus_createdAt_idx" ON "Clip"("processingStatus", "createdAt");
