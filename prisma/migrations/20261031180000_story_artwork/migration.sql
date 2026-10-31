-- Story artwork: character snapshot, visual brief, one master illustration, and spend limits.
-- All new columns are optional. Existing stories keep working.

ALTER TABLE "Story" ADD COLUMN "characterId" TEXT;
ALTER TABLE "Story" ADD COLUMN "characterSnapshot" JSONB;
ALTER TABLE "Story" ADD COLUMN "visualBrief" JSONB;
ALTER TABLE "Story" ADD COLUMN "illustrationFilename" TEXT;
ALTER TABLE "Story" ADD COLUMN "illustrationUrl" TEXT;
ALTER TABLE "Story" ADD COLUMN "coverFilename" TEXT;
ALTER TABLE "Story" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "Story" ADD COLUMN "artworkStatus" TEXT;
ALTER TABLE "Story" ADD COLUMN "artworkCacheKey" TEXT;
ALTER TABLE "Story" ADD COLUMN "posterCaption" TEXT;
ALTER TABLE "Story" ADD COLUMN "dedication" TEXT;
ALTER TABLE "Story" ADD COLUMN "artworkMeta" JSONB;

CREATE INDEX "Story_artworkCacheKey_idx" ON "Story"("artworkCacheKey");

CREATE TABLE "ArtworkJob" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "quality" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "blockedUntil" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtworkJob_cacheKey_key" ON "ArtworkJob"("cacheKey");
CREATE INDEX "ArtworkJob_scopeKey_createdAt_idx" ON "ArtworkJob"("scopeKey", "createdAt");
CREATE INDEX "ArtworkJob_storyId_idx" ON "ArtworkJob"("storyId");

CREATE TABLE "ArtworkSpendDay" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "generations" INTEGER NOT NULL DEFAULT 0,
    "estimatedUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ArtworkSpendDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtworkSpendDay_scopeKey_dayKey_key" ON "ArtworkSpendDay"("scopeKey", "dayKey");
