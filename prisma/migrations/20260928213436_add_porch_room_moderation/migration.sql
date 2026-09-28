-- CreateTable
CREATE TABLE "PorchRoomRestriction" (
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PorchRoomRestriction_pkey" PRIMARY KEY ("roomId","userId")
);

-- CreateIndex
CREATE INDEX "PorchRoomRestriction_userId_idx" ON "PorchRoomRestriction"("userId");

-- AddForeignKey
ALTER TABLE "PorchRoomRestriction" ADD CONSTRAINT "PorchRoomRestriction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PorchRoomRestriction" ADD CONSTRAINT "PorchRoomRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
