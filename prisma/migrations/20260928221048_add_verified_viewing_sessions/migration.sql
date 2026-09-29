-- CreateTable
CREATE TABLE "ViewingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "verifiedSeconds" INTEGER NOT NULL DEFAULT 0,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "invalidReason" TEXT,

    CONSTRAINT "ViewingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewingSession_userId_startedAt_idx" ON "ViewingSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ViewingSession_roomId_startedAt_idx" ON "ViewingSession"("roomId", "startedAt");

-- AddForeignKey
ALTER TABLE "ViewingSession" ADD CONSTRAINT "ViewingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewingSession" ADD CONSTRAINT "ViewingSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
