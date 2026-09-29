-- CreateEnum
CREATE TYPE "AccountPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "FollowRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactPrivacy" AS ENUM ('EVERYONE', 'FOLLOWERS', 'FRIENDS', 'NOBODY');

-- CreateEnum
CREATE TYPE "LiveVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ReplayStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "ClipVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LIVE_STARTED';
ALTER TYPE "NotificationType" ADD VALUE 'GIFT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'FOLLOWER_MILESTONE';
ALTER TYPE "NotificationType" ADD VALUE 'REPLAY_READY';
ALTER TYPE "NotificationType" ADD VALUE 'CREATOR_LEVEL';
ALTER TYPE "NotificationType" ADD VALUE 'BADGE_UNLOCKED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PorchStageRequestStatus" ADD VALUE 'INVITED';
ALTER TYPE "PorchStageRequestStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'CO_OWNER';

-- AlterTable
ALTER TABLE "HostApplication" ADD COLUMN     "identityProviderRef" TEXT,
ADD COLUMN     "identityVerificationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "payoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxCompletedAt" TIMESTAMP(3),
ADD COLUMN     "taxProviderRef" TEXT,
ADD COLUMN     "taxStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "PorchRoom" ADD COLUMN     "category" TEXT,
ADD COLUMN     "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "defaultBackdrop" TEXT,
ADD COLUMN     "defaultEffect" TEXT,
ADD COLUMN     "followerBaseline" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followersOnlyChat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "giftsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "guestRequestsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "musicEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "peakViewers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reactionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "replayUrl" TEXT,
ADD COLUMN     "replayVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slowModeSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalViewers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visibility" "LiveVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commentPrivacy" "ContactPrivacy" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "hideActivity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideConnections" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liveInvitePrivacy" "ContactPrivacy" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "mentionPrivacy" "ContactPrivacy" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "messagePrivacy" "ContactPrivacy" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "privacy" "AccountPrivacy" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "profileVideoUrl" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FollowRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "FollowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "FollowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveReaction" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '❤️',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveReplay" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "ReplayStatus" NOT NULL DEFAULT 'PENDING',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "mediaUrl" TEXT,
    "downloadUrl" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalViewers" INTEGER NOT NULL DEFAULT 0,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "verifiedWatchSeconds" INTEGER NOT NULL DEFAULT 0,
    "followersGained" INTEGER NOT NULL DEFAULT 0,
    "reactionCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "giftCount" INTEGER NOT NULL DEFAULT 0,
    "giftValueCents" INTEGER NOT NULL DEFAULT 0,
    "creatorEarningsCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),

    CONSTRAINT "LiveReplay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "replayId" TEXT,
    "title" TEXT,
    "mediaUrl" TEXT,
    "startSeconds" INTEGER NOT NULL,
    "endSeconds" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "ClipVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClipLike" (
    "clipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClipLike_pkey" PRIMARY KEY ("clipId","userId")
);

-- CreateTable
CREATE TABLE "ClipComment" (
    "id" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClipComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSignal" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "type" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveViewerPresence" (
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LiveViewerPresence_pkey" PRIMARY KEY ("roomId","userId")
);

-- AlterTable
ALTER TABLE "ViewingSession" ADD COLUMN     "activityVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "HostCosmetic" (
    "userId" TEXT NOT NULL,
    "effectKey" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "HostCosmetic_pkey" PRIMARY KEY ("userId","effectKey")
);

-- CreateTable
CREATE TABLE "CosmeticGift" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "effectKey" TEXT NOT NULL,
    "coinCost" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CosmeticGift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutLedgerEntry" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "payoutId" TEXT,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "featured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustCase" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reportId" TEXT,
    "assignedStaffId" TEXT,
    "accountLevel" BOOLEAN NOT NULL DEFAULT false,
    "affectsCreatorStanding" BOOLEAN NOT NULL DEFAULT false,
    "affectsHostStanding" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "permanentEnforcement" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TrustCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustCaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderationActionId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewerId" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteHost" (
    "userId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteHost_pkey" PRIMARY KEY ("userId","hostId")
);

-- CreateTable
CREATE TABLE "FavoritePorch" (
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoritePorch_pkey" PRIMARY KEY ("userId","roomId")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleTeam" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "side" INTEGER NOT NULL,
    "memberIds" TEXT[],
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BattleTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyHostRank" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "badgeKey" TEXT NOT NULL DEFAULT 'TOP_20_HOST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyHostRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowRequest_targetId_status_createdAt_idx" ON "FollowRequest"("targetId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FollowRequest_requesterId_targetId_key" ON "FollowRequest"("requesterId", "targetId");

-- CreateIndex
CREATE INDEX "LiveMessage_roomId_createdAt_idx" ON "LiveMessage"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveMessage_roomId_pinned_idx" ON "LiveMessage"("roomId", "pinned");

-- CreateIndex
CREATE INDEX "LiveReaction_roomId_createdAt_idx" ON "LiveReaction"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveReaction_userId_createdAt_idx" ON "LiveReaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveReplay_roomId_key" ON "LiveReplay"("roomId");

-- CreateIndex
CREATE INDEX "LiveReplay_hostId_createdAt_idx" ON "LiveReplay"("hostId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveReplay_status_createdAt_idx" ON "LiveReplay"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Clip_creatorId_createdAt_idx" ON "Clip"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "Clip_roomId_createdAt_idx" ON "Clip"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "ClipLike_userId_createdAt_idx" ON "ClipLike"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClipComment_clipId_createdAt_idx" ON "ClipComment"("clipId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveSignal_roomId_createdAt_idx" ON "LiveSignal"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveSignal_targetUserId_createdAt_idx" ON "LiveSignal"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveViewerPresence_roomId_active_lastSeenAt_idx" ON "LiveViewerPresence"("roomId", "active", "lastSeenAt");

-- CreateIndex
CREATE INDEX "ViewingSession_userId_endedAt_eligible_idx" ON "ViewingSession"("userId", "endedAt", "eligible");

-- CreateIndex
CREATE INDEX "CosmeticGift_hostId_createdAt_idx" ON "CosmeticGift"("hostId", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutLedgerEntry_creatorId_createdAt_idx" ON "PayoutLedgerEntry"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutLedgerEntry_payoutId_idx" ON "PayoutLedgerEntry"("payoutId");

-- CreateIndex
CREATE INDEX "PayoutLedgerEntry_referenceType_referenceId_idx" ON "PayoutLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "UserBadge_userId_unlockedAt_idx" ON "UserBadge"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_key_key" ON "UserBadge"("userId", "key");

-- CreateIndex
CREATE INDEX "TrustCase_targetUserId_openedAt_idx" ON "TrustCase"("targetUserId", "openedAt");

-- CreateIndex
CREATE INDEX "TrustCase_status_severity_openedAt_idx" ON "TrustCase"("status", "severity", "openedAt");

-- CreateIndex
CREATE INDEX "TrustCaseEvent_caseId_createdAt_idx" ON "TrustCaseEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "Appeal_status_createdAt_idx" ON "Appeal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Appeal_userId_createdAt_idx" ON "Appeal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FavoriteHost_userId_position_idx" ON "FavoriteHost"("userId", "position");

-- CreateIndex
CREATE INDEX "FavoritePorch_userId_position_idx" ON "FavoritePorch"("userId", "position");

-- CreateIndex
CREATE INDEX "Battle_roomId_status_idx" ON "Battle"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BattleTeam_battleId_side_key" ON "BattleTeam"("battleId", "side");

-- CreateIndex
CREATE INDEX "MonthlyHostRank_month_rank_idx" ON "MonthlyHostRank"("month", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyHostRank_hostId_month_key" ON "MonthlyHostRank"("hostId", "month");

-- AddForeignKey
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveReaction" ADD CONSTRAINT "LiveReaction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveReaction" ADD CONSTRAINT "LiveReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveReplay" ADD CONSTRAINT "LiveReplay_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveReplay" ADD CONSTRAINT "LiveReplay_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_replayId_fkey" FOREIGN KEY ("replayId") REFERENCES "LiveReplay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipLike" ADD CONSTRAINT "ClipLike_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipLike" ADD CONSTRAINT "ClipLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipComment" ADD CONSTRAINT "ClipComment_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipComment" ADD CONSTRAINT "ClipComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSignal" ADD CONSTRAINT "LiveSignal_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSignal" ADD CONSTRAINT "LiveSignal_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSignal" ADD CONSTRAINT "LiveSignal_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveViewerPresence" ADD CONSTRAINT "LiveViewerPresence_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveViewerPresence" ADD CONSTRAINT "LiveViewerPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostCosmetic" ADD CONSTRAINT "HostCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosmeticGift" ADD CONSTRAINT "CosmeticGift_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosmeticGift" ADD CONSTRAINT "CosmeticGift_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLedgerEntry" ADD CONSTRAINT "PayoutLedgerEntry_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLedgerEntry" ADD CONSTRAINT "PayoutLedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "CreatorPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustCase" ADD CONSTRAINT "TrustCase_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustCaseEvent" ADD CONSTRAINT "TrustCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "TrustCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteHost" ADD CONSTRAINT "FavoriteHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteHost" ADD CONSTRAINT "FavoriteHost_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritePorch" ADD CONSTRAINT "FavoritePorch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritePorch" ADD CONSTRAINT "FavoritePorch_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PorchRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleTeam" ADD CONSTRAINT "BattleTeam_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyHostRank" ADD CONSTRAINT "MonthlyHostRank_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
