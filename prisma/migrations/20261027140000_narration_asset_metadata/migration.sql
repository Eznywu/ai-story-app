-- Narration identity on existing stories. All new columns are optional.
ALTER TABLE "Story" ADD COLUMN "audioModelId" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioVoiceId" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioVoiceSettings" JSONB;
ALTER TABLE "Story" ADD COLUMN "audioLanguage" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioDictionaryVersion" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioConfigVersion" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioConfigId" TEXT;
ALTER TABLE "Story" ADD COLUMN "audioCacheKey" TEXT;

CREATE TABLE "NarrationAsset" (
    "id" TEXT NOT NULL,
    "storyId" TEXT,
    "sectionIndex" INTEGER NOT NULL DEFAULT 0,
    "sectionCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "modelId" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "voiceSettings" JSONB NOT NULL,
    "language" TEXT NOT NULL,
    "dictionaryVersion" TEXT NOT NULL,
    "configVersion" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "narrationScript" TEXT NOT NULL,
    "filename" TEXT,
    "url" TEXT,
    "durationMs" INTEGER,
    "validityStatus" TEXT NOT NULL DEFAULT 'unchecked',
    "validityNotes" TEXT,
    "transcriptStatus" TEXT NOT NULL DEFAULT 'unchecked',
    "transcriptNotes" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "baselineFlag" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'story',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NarrationAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NarrationReviewItem" (
    "id" TEXT NOT NULL,
    "assetId" TEXT,
    "source" TEXT NOT NULL,
    "word" TEXT,
    "timestampMs" INTEGER,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NarrationReviewItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NarrationReviewReport" (
    "id" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NarrationReviewReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NarrationAsset_storyId_createdAt_idx" ON "NarrationAsset"("storyId", "createdAt");
CREATE INDEX "NarrationAsset_cacheKey_idx" ON "NarrationAsset"("cacheKey");
CREATE INDEX "NarrationAsset_createdAt_idx" ON "NarrationAsset"("createdAt");
CREATE INDEX "NarrationAsset_baselineFlag_idx" ON "NarrationAsset"("baselineFlag");
CREATE INDEX "NarrationReviewItem_status_createdAt_idx" ON "NarrationReviewItem"("status", "createdAt");
CREATE INDEX "NarrationReviewItem_source_idx" ON "NarrationReviewItem"("source");
CREATE INDEX "NarrationReviewReport_weekKey_idx" ON "NarrationReviewReport"("weekKey");

ALTER TABLE "NarrationAsset" ADD CONSTRAINT "NarrationAsset_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
