import fs from "node:fs/promises";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { saveMediaBytes, deleteMediaReference, localMediaPath, isRemoteMediaUrl } from "@/lib/media/objectStore";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import type { ArtworkJobRow, ArtworkStore, ArtworkStoryRow } from "@/lib/posters/artworkService";
import type { VisualBrief } from "@/lib/posters/visualBrief";

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
}

function attemptCount(meta: Record<string, unknown>, fallback: number): number {
  const value = meta.attemptCount;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function readStory(userId: string, storyId: string): Promise<ArtworkStoryRow | null> {
  if (!isSafeStoryId(storyId)) return null;
  const row = await prisma.story.findFirst({ where: { id: storyId, userId } });
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    genre: row.genre,
    text: row.text,
    age: row.age,
    language: row.language,
    mainCharacterName: row.mainCharacterName,
    childGender: row.childGender,
    characterSnapshot: row.characterSnapshot,
    visualBrief: row.visualBrief,
    illustrationUrl: row.illustrationUrl,
    coverUrl: row.coverUrl,
    posterUrl: row.posterUrl,
    artworkStatus: row.artworkStatus,
    artworkCacheKey: row.artworkCacheKey,
    posterCaption: row.posterCaption,
    dedication: row.dedication,
    artworkMeta: row.artworkMeta,
  };
}

function stamp() {
  return Date.now().toString(36);
}

export function createPrismaArtworkStore(): ArtworkStore {
  return {
    getStory: readStory,
    async saveBrief(storyId, brief: VisualBrief) {
      await prisma.story.update({
        where: { id: storyId },
        data: { visualBrief: brief },
      });
    },
    async findJob(cacheKey) {
      const row = await prisma.artworkJob.findUnique({ where: { cacheKey } });
      if (!row) return null;
      return {
        cacheKey: row.cacheKey,
        scopeKey: row.scopeKey,
        storyId: row.storyId,
        status: row.status as ArtworkJobRow["status"],
        leaseUntil: row.leaseUntil?.getTime() ?? null,
        blockedUntil: row.blockedUntil?.getTime() ?? null,
        attemptCount: row.attemptCount,
        estimatedCostUsd: row.estimatedCostUsd,
        illustrationBytes: null,
        illustrationUrl: null,
        coverUrl: null,
        posterUrl: null,
        errorMessage: row.errorMessage,
      };
    },
    async insertPending(job) {
      try {
        await prisma.artworkJob.create({
          data: {
            cacheKey: job.cacheKey,
            scopeKey: job.scopeKey,
            storyId: job.storyId,
            status: "pending",
            attemptCount: job.attemptCount,
            estimatedCostUsd: job.estimatedCostUsd,
            leaseUntil: new Date(job.leaseUntil ?? Date.now() + 120_000),
          },
        });
        return "inserted";
      } catch (error) {
        if (isUniqueViolation(error)) return "exists";
        throw error;
      }
    },
    async takeLease(cacheKey, until) {
      const updated = await prisma.artworkJob.updateMany({
        where: {
          cacheKey,
          status: { not: "illustrated" },
          OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }, { status: { not: "pending" } }],
        },
        data: { status: "pending", leaseUntil: new Date(until) },
      });
      return updated.count === 1;
    },
    async reserveSpend({ scopeKey, dayKey, estimateUsd, caps }) {
      return prisma.$transaction(async (tx) => {
        await tx.artworkSpendDay.upsert({
          where: { scopeKey_dayKey: { scopeKey, dayKey } },
          create: { scopeKey, dayKey, generations: 0, estimatedUsd: 0 },
          update: {},
        });
        const updated = await tx.artworkSpendDay.updateMany({
          where: {
            scopeKey,
            dayKey,
            generations: { lt: caps.dailyGenerations },
            estimatedUsd: { lte: Math.max(0, caps.dailySpendUsd - estimateUsd) },
          },
          data: {
            generations: { increment: 1 },
            estimatedUsd: { increment: estimateUsd },
          },
        });
        return updated.count === 1;
      });
    },
    async saveSuccess(input) {
      const previous = await prisma.story.findUnique({
        where: { id: input.storyId },
        select: {
          illustrationFilename: true,
          illustrationUrl: true,
          coverFilename: true,
          coverUrl: true,
          posterFilename: true,
          posterUrl: true,
        },
      });
      const token = stamp();
      const illustrationName = `illustration_${input.storyId}${token}.png`;
      const coverName = `cover_${input.storyId}${token}.png`;
      const posterName = `poster_${input.storyId}${token}.png`;
      const [illustration, cover, poster] = await Promise.all([
        saveMediaBytes({
          folder: "posters",
          filename: illustrationName,
          body: input.illustration,
          contentType: "image/png",
        }),
        saveMediaBytes({
          folder: "posters",
          filename: coverName,
          body: input.cover,
          contentType: "image/png",
        }),
        saveMediaBytes({
          folder: "posters",
          filename: posterName,
          body: input.poster,
          contentType: "image/png",
        }),
      ]);
      const estimated = input.meta.estimatedCostUsd;
      await prisma.story.update({
        where: { id: input.storyId },
        data: {
          title: typeof input.meta.title === "string" ? input.meta.title : undefined,
          illustrationFilename: illustration.filename,
          illustrationUrl: illustration.url,
          coverFilename: cover.filename,
          coverUrl: cover.url,
          posterFilename: poster.filename,
          posterUrl: poster.url,
          posterCaption: input.caption,
          dedication: input.dedication,
          artworkStatus: "illustrated",
          artworkCacheKey: input.cacheKey,
          artworkMeta: input.meta as Prisma.InputJsonValue,
        },
      });
      await prisma.artworkJob.update({
        where: { cacheKey: input.cacheKey },
        data: {
          status: "illustrated",
          leaseUntil: null,
          blockedUntil: null,
          errorMessage: null,
          attemptCount: attemptCount(input.meta, 1),
          estimatedCostUsd: typeof estimated === "number" ? estimated : 0,
          provider: typeof input.meta.provider === "string" ? input.meta.provider : null,
          model: typeof input.meta.model === "string" ? input.meta.model : null,
          quality: typeof input.meta.quality === "string" ? input.meta.quality : null,
        },
      });
      if (previous) {
        await deleteMediaReference({
          folder: "posters",
          filename: previous.illustrationFilename,
          url: previous.illustrationUrl,
        });
        await deleteMediaReference({
          folder: "posters",
          filename: previous.coverFilename,
          url: previous.coverUrl,
        });
        await deleteMediaReference({
          folder: "posters",
          filename: previous.posterFilename,
          url: previous.posterUrl,
        });
      }
      return {
        illustrationUrl: illustration.url,
        coverUrl: cover.url,
        posterUrl: poster.url,
      };
    },
    async saveTerminal(input) {
      let coverUrl: string | null = null;
      let posterUrl: string | null = null;
      if (input.cover && input.poster) {
        const token = stamp();
        const cover = await saveMediaBytes({
          folder: "posters",
          filename: `cover_${input.storyId}${token}.png`,
          body: input.cover,
          contentType: "image/png",
        });
        const poster = await saveMediaBytes({
          folder: "posters",
          filename: `poster_${input.storyId}${token}.png`,
          body: input.poster,
          contentType: "image/png",
        });
        coverUrl = cover.url;
        posterUrl = poster.url;
      }
      await prisma.story.update({
        where: { id: input.storyId },
        data: {
          artworkStatus: input.status,
          artworkCacheKey: input.cacheKey,
          artworkMeta: input.meta as Prisma.InputJsonValue,
          ...(coverUrl ? { coverUrl } : {}),
          ...(posterUrl ? { posterUrl } : {}),
        },
      });
      await prisma.artworkJob.upsert({
        where: { cacheKey: input.cacheKey },
        create: {
          cacheKey: input.cacheKey,
          scopeKey: "unknown",
          storyId: input.storyId,
          status: input.status,
          errorMessage: input.message,
          blockedUntil: input.blockedUntil ? new Date(input.blockedUntil) : null,
          leaseUntil: null,
          attemptCount: attemptCount(input.meta, 1),
        },
        update: {
          status: input.status,
          errorMessage: input.message,
          blockedUntil: input.blockedUntil ? new Date(input.blockedUntil) : null,
          leaseUntil: null,
          attemptCount: attemptCount(input.meta, 1),
        },
      });
      return { coverUrl, posterUrl };
    },
    async readIllustration(storyId) {
      const row = await prisma.story.findUnique({
        where: { id: storyId },
        select: { illustrationFilename: true, illustrationUrl: true },
      });
      if (!row) return null;
      const filename = row.illustrationFilename ?? "";
      const local = localMediaPath("posters", filename);
      if (local) {
        try {
          return await fs.readFile(local);
        } catch {
          /* fall through to the stored URL */
        }
      }
      if (row.illustrationUrl && isRemoteMediaUrl(row.illustrationUrl)) {
        const response = await fetch(row.illustrationUrl);
        if (!response.ok) return null;
        return Buffer.from(await response.arrayBuffer());
      }
      return null;
    },
  };
}
