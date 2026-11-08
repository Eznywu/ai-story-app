import { prisma } from "@/lib/prisma";
import { deleteMediaReference, readPrivateMedia, saveMediaBytes } from "@/lib/media/objectStore";
import { PREVIEW_ATTEMPT_CEILING_USD } from "./previewPlan";
import { cachedPreviewUsable, isServablePreviewSource, type ServablePreviewSource } from "./previewAudio";

type PreviewRow = {
  id: string;
  source: string;
  filename: string | null;
  storageUrl: string | null;
};

/**
 * Returns a cached preview only when its row names a real source and the stored file still passes the audio
 * check. A row that fails (an old mock clip, or a file that is not real speech) is deleted, so only that entry
 * is redone. A read error leaves the row alone.
 */
export async function readCachedPreview(
  cacheKey: string
): Promise<{ bytes: Buffer; source: ServablePreviewSource } | null> {
  const row = await prisma.narrationPreview.findUnique({ where: { cacheKey } }).catch(() => null);
  if (!row) return null;
  if (!isServablePreviewSource(row.source)) {
    await forgetPreview(row);
    return null;
  }
  let bytes: Buffer | null;
  try {
    bytes = await readPrivateMedia({ folder: "voices", filename: row.filename, storageUrl: row.storageUrl });
  } catch {
    return null;
  }
  if (!bytes) return null;
  if (!cachedPreviewUsable(row.source, bytes)) {
    await forgetPreview(row);
    return null;
  }
  return { bytes, source: row.source };
}

export async function forgetPreview(row: PreviewRow): Promise<void> {
  try {
    await deleteMediaReference({ folder: "voices", filename: row.filename, url: row.storageUrl });
    await prisma.narrationPreview.delete({ where: { id: row.id } });
  } catch (error) {
    console.warn("[voice-preview] could not drop an unusable cached preview", error instanceof Error ? error.message : error);
  }
}

/** Caches a checked preview so replay needs no provider call. A clip that could not be stored is still played once. */
export async function rememberPreview(input: {
  cacheKey: string;
  voiceAppId: string;
  ownerUserId: string | null;
  language: string;
  modelId: string;
  voiceVersion: number;
  source: ServablePreviewSource;
  bytes: Buffer;
}): Promise<void> {
  try {
    const saved = await saveMediaBytes({
      folder: "voices",
      filename: `voice_preview_${input.cacheKey.slice(0, 24)}.mp3`,
      body: input.bytes,
      contentType: "audio/mpeg",
      access: "private",
    });
    const stored = {
      source: input.source,
      modelId: input.modelId,
      filename: saved.filename,
      storageUrl: saved.url.startsWith("http") ? saved.url : null,
    };
    await prisma.narrationPreview.upsert({
      where: { cacheKey: input.cacheKey },
      create: {
        cacheKey: input.cacheKey,
        voiceAppId: input.voiceAppId,
        ownerUserId: input.ownerUserId,
        language: input.language,
        voiceVersion: input.voiceVersion,
        ...stored,
      },
      update: stored,
    });
  } catch (error) {
    console.warn("[voice-preview] preview not cached", error instanceof Error ? error.message : error);
  }
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Live preview attempts made today across every account, each counted at the dearest preview line. */
export async function previewSpendTodayUsd(now = new Date()): Promise<number> {
  const attempts = await prisma.voiceAttempt.count({ where: { kind: "preview", createdAt: { gte: startOfUtcDay(now) } } });
  return attempts * PREVIEW_ATTEMPT_CEILING_USD;
}

/** Recorded before the provider call, so a timeout or failure still counts against the cap. */
export async function recordPreviewAttempt(userId: string, now = new Date()): Promise<void> {
  await prisma.voiceAttempt.create({ data: { userId, kind: "preview", createdAt: now } });
}
