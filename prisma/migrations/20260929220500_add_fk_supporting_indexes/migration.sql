-- AddIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- AddIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- AddIndex
CREATE INDEX "Save_postId_idx" ON "Save"("postId");

-- AddIndex
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");

-- AddIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- AddIndex
CREATE INDEX "LiveMessage_userId_idx" ON "LiveMessage"("userId");

-- AddIndex
CREATE INDEX "Clip_replayId_idx" ON "Clip"("replayId");

-- AddIndex
CREATE INDEX "ClipComment_userId_idx" ON "ClipComment"("userId");

-- AddIndex
CREATE INDEX "LiveSignal_senderId_idx" ON "LiveSignal"("senderId");

-- AddIndex
CREATE INDEX "PorchStageRequest_userId_idx" ON "PorchStageRequest"("userId");

-- AddIndex
CREATE INDEX "LiveViewerPresence_userId_idx" ON "LiveViewerPresence"("userId");

-- AddIndex
CREATE INDEX "GiftTransaction_roomId_idx" ON "GiftTransaction"("roomId");

-- AddIndex
CREATE INDEX "CosmeticGift_senderId_idx" ON "CosmeticGift"("senderId");

-- AddIndex
CREATE INDEX "ModerationActionLog_actorId_idx" ON "ModerationActionLog"("actorId");

-- AddIndex
CREATE INDEX "FavoriteHost_hostId_idx" ON "FavoriteHost"("hostId");

-- AddIndex
CREATE INDEX "FavoritePorch_roomId_idx" ON "FavoritePorch"("roomId");
