-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Preserve access for accounts that existed before email verification was introduced.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;

-- AlterTable
ALTER TABLE "Session"
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "ipHash" TEXT,
ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("keyHash")
);

-- CreateTable
CREATE TABLE "MfaCredential" (
    "userId" TEXT NOT NULL,
    "secretEncrypted" TEXT,
    "pendingSecretEncrypted" TEXT,
    "enabledAt" TIMESTAMP(3),
    "recoveryCodesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfaCredential_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AuthEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_createdAt_idx" ON "AuthToken"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthRateLimit_action_updatedAt_idx" ON "AuthRateLimit"("action", "updatedAt");

-- CreateIndex
CREATE INDEX "AuthEvent_userId_createdAt_idx" ON "AuthEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthEvent_kind_createdAt_idx" ON "AuthEvent"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaCredential" ADD CONSTRAINT "MfaCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthEvent" ADD CONSTRAINT "AuthEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
