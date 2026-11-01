-- Parent voices: ownership, consent, private samples, preview cache, and narration identity.
-- Additive only. Existing voice and story rows keep their data.

ALTER TABLE "Voice" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE "Voice" ADD COLUMN "voiceVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Voice" ADD COLUMN "requiresVerification" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Voice" ADD COLUMN "consentAt" TIMESTAMP(3);
ALTER TABLE "Voice" ADD COLUMN "consentTextVersion" TEXT;
ALTER TABLE "Voice" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Voice" ADD COLUMN "sampleFilename" TEXT;
ALTER TABLE "Voice" ADD COLUMN "sampleStorageUrl" TEXT;
ALTER TABLE "Voice" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Voice_userId_idempotencyKey_key" ON "Voice"("userId", "idempotencyKey");
CREATE INDEX "Voice_status_idx" ON "Voice"("status");

CREATE TABLE "VoiceAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'clone',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VoiceAttempt_userId_kind_createdAt_idx" ON "VoiceAttempt"("userId", "kind", "createdAt");

CREATE TABLE "VoiceCleanup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerVoiceId" TEXT NOT NULL,
    "sampleFilename" TEXT,
    "sampleStorageUrl" TEXT,
    "voiceRowId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceCleanup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VoiceCleanup_status_createdAt_idx" ON "VoiceCleanup"("status", "createdAt");

CREATE TABLE "VoicePreference" (
    "userId" TEXT NOT NULL,
    "voiceAppId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VoicePreference_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "VoicePreference" ADD CONSTRAINT "VoicePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NarrationPreview" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "voiceAppId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "language" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "voiceVersion" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "filename" TEXT,
    "storageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NarrationPreview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NarrationPreview_cacheKey_key" ON "NarrationPreview"("cacheKey");
CREATE INDEX "NarrationPreview_ownerUserId_voiceAppId_idx" ON "NarrationPreview"("ownerUserId", "voiceAppId");

ALTER TABLE "Story" ADD COLUMN "audioPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Story" ADD COLUMN "audioStorageUrl" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioVoiceKind" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioVoiceVersion" INTEGER;

ALTER TABLE "NarrationAsset" ADD COLUMN "voiceKind" TEXT;
ALTER TABLE "NarrationAsset" ADD COLUMN "voiceVersion" INTEGER;
ALTER TABLE "NarrationAsset" ADD COLUMN "ownerUserId" TEXT;
