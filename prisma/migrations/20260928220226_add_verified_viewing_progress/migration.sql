-- CreateTable
CREATE TABLE "ViewingProgress" (
    "userId" TEXT NOT NULL,
    "verifiedSeconds" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewingProgress_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "ViewingProgress" ADD CONSTRAINT "ViewingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
