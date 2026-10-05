-- OUTSiiDE final prelaunch account, policy and payout compliance hardening

ALTER TABLE "HostApplication"
  ADD CONSTRAINT "HostApplication_identityProviderRef_key" UNIQUE ("identityProviderRef");

ALTER TABLE "HostApplication"
  ADD CONSTRAINT "HostApplication_taxProviderRef_key" UNIQUE ("taxProviderRef");

ALTER TABLE "CreatorPayoutAccount"
  ADD COLUMN "identityStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "taxStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "taxFormType" TEXT,
  ADD COLUMN "taxProviderRef" TEXT,
  ADD COLUMN "taxCompletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CreatorPayoutAccount_taxProviderRef_key"
  ON "CreatorPayoutAccount"("taxProviderRef");

CREATE TABLE "PolicyAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "policyType" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "metadataJson" TEXT,
  CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PolicyAcceptance_userId_policyType_policyVersion_key"
  ON "PolicyAcceptance"("userId","policyType","policyVersion");
CREATE INDEX "PolicyAcceptance_userId_acceptedAt_idx"
  ON "PolicyAcceptance"("userId","acceptedAt");
CREATE INDEX "PolicyAcceptance_policyType_policyVersion_acceptedAt_idx"
  ON "PolicyAcceptance"("policyType","policyVersion","acceptedAt");

ALTER TABLE "PolicyAcceptance"
  ADD CONSTRAINT "PolicyAcceptance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SignupNetwork" (
  "ipHash" TEXT NOT NULL,
  "firstUserId" TEXT NOT NULL,
  "blockedAttempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignupNetwork_pkey" PRIMARY KEY ("ipHash")
);

CREATE INDEX "SignupNetwork_firstUserId_idx" ON "SignupNetwork"("firstUserId");
CREATE INDEX "SignupNetwork_lastAttemptAt_idx" ON "SignupNetwork"("lastAttemptAt");

CREATE TABLE "SignupDevice" (
  "deviceHash" TEXT NOT NULL,
  "firstUserId" TEXT NOT NULL,
  "blockedAttempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignupDevice_pkey" PRIMARY KEY ("deviceHash")
);

CREATE INDEX "SignupDevice_firstUserId_idx" ON "SignupDevice"("firstUserId");
CREATE INDEX "SignupDevice_lastAttemptAt_idx" ON "SignupDevice"("lastAttemptAt");

-- Backfill known signup networks from existing immutable authentication history.
INSERT INTO "SignupNetwork" ("ipHash","firstUserId","blockedAttempts","createdAt","lastAttemptAt")
SELECT DISTINCT ON ("ipHash")
  "ipHash",
  "userId",
  0,
  "createdAt",
  "createdAt"
FROM "AuthEvent"
WHERE "kind" = 'ACCOUNT_CREATED'
  AND "ipHash" IS NOT NULL
  AND "userId" IS NOT NULL
ORDER BY "ipHash","createdAt" ASC
ON CONFLICT ("ipHash") DO NOTHING;
