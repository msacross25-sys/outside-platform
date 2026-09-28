-- CreateEnum
CREATE TYPE "PorchRoomType" AS ENUM ('VIDEO', 'VOICE');

-- AlterTable
ALTER TABLE "PorchRoom" ADD COLUMN     "roomType" "PorchRoomType" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN     "screenSharing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stageSize" INTEGER NOT NULL DEFAULT 1;
