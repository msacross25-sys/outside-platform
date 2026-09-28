-- CreateEnum
CREATE TYPE "PorchStageRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "HostApplication" ADD COLUMN     "agreementAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PorchStageRequest" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PorchStageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PorchStageRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PorchStageRequest_roomId_status_requestedAt_idx" ON "PorchStageRequest"("roomId", "status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PorchStageRequest_roomId_userId_key" ON "PorchStageRequest"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "PorchStageRequest" ADD CONSTRAINT "PorchStageRequest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PorchStageRequest" ADD CONSTRAINT "PorchStageRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
