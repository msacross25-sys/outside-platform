-- Support batched creator finance queries.
CREATE INDEX "GiftTransaction_recipientId_status_createdAt_idx"
ON "GiftTransaction"("recipientId","status","createdAt");

CREATE INDEX "CreatorPayout_creatorId_status_createdAt_idx"
ON "CreatorPayout"("creatorId","status","createdAt");

-- Support active verified-viewing lookup without an extra sort.
CREATE INDEX "ViewingSession_userId_endedAt_eligible_startedAt_idx"
ON "ViewingSession"("userId","endedAt","eligible","startedAt");
