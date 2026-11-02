import { prisma } from "@/lib/prisma";
import { GUEST_EMAIL, LOCAL_TEST_PARENT_EMAIL, authEnabled, localTestParentEnabled } from "@/lib/auth/config";
import { deleteMediaReference, readPrivateMedia, saveMediaBytes } from "@/lib/media/objectStore";
import { CLEARED_STORY_AUDIO, removeStoryAudioFile } from "@/lib/audio/storyMediaFiles";
import type { StoredVoice, VoiceStore } from "@/lib/voices/personalVoice";
import type { VoiceStatus } from "@/lib/voices/decisions";
import { personalVoicesAllowed } from "@/lib/voices/decisions";

function mapVoice(row: {
  id: string;
  userId: string | null;
  displayName: string;
  language: string;
  recordingLocale: string | null;
  scriptVersion: string | null;
  status: string;
  voiceVersion: number;
  requiresVerification: boolean;
  voiceId: string;
  idempotencyKey: string | null;
  consentTextVersion: string | null;
  sampleFilename: string | null;
  sampleStorageUrl: string | null;
}): StoredVoice {
  return {
    id: row.id,
    userId: row.userId ?? "",
    displayName: row.displayName,
    language: row.recordingLocale || row.language,
    recordingLocale: row.recordingLocale,
    scriptVersion: row.scriptVersion,
    status: (row.status as VoiceStatus) || "ready",
    voiceVersion: row.voiceVersion,
    requiresVerification: row.requiresVerification,
    providerVoiceId: row.voiceId,
    idempotencyKey: row.idempotencyKey,
    consentTextVersion: row.consentTextVersion,
    sampleFilename: row.sampleFilename,
    sampleStorageUrl: row.sampleStorageUrl,
  };
}

export function accountCanOwnVoices(email: string): boolean {
  return personalVoicesAllowed({
    authEnabled: authEnabled(),
    email,
    guestEmail: GUEST_EMAIL,
    localTestParentEmail: LOCAL_TEST_PARENT_EMAIL,
    localTestParent: localTestParentEnabled(),
  });
}

export function prismaVoiceStore(): VoiceStore {
  return {
    async findByIdempotency(userId, key) {
      const row = await prisma.voice.findFirst({ where: { userId, idempotencyKey: key } });
      return row ? mapVoice(row) : null;
    },
    async countActive(userId) {
      return prisma.voice.count({ where: { userId } });
    },
    async countAttemptsSince(userId, since) {
      return prisma.voiceAttempt.count({ where: { userId, kind: "clone", createdAt: { gte: since } } });
    },
    async recordAttempt(userId, now) {
      await prisma.voiceAttempt.create({ data: { userId, kind: "clone", createdAt: now } });
    },
    async insert(voice) {
      await prisma.voice.create({
        data: {
          id: voice.id,
          userId: voice.userId,
          displayName: voice.displayName,
          language: voice.recordingLocale || voice.language,
          recordingLocale: voice.recordingLocale,
          scriptVersion: voice.scriptVersion,
          status: voice.status,
          voiceVersion: voice.voiceVersion,
          requiresVerification: voice.requiresVerification,
          voiceId: voice.providerVoiceId,
          idempotencyKey: voice.idempotencyKey,
          consentAt: voice.consentAt,
          consentTextVersion: voice.consentTextVersion,
          sampleFilename: voice.sampleFilename,
          sampleStorageUrl: voice.sampleStorageUrl,
        },
      });
    },
    async update(id, userId, patch) {
      const existing = await prisma.voice.findFirst({ where: { id, userId } });
      if (!existing) return null;
      const row = await prisma.voice.update({
        where: { id },
        data: {
          displayName: patch.displayName,
          status: patch.status,
          sampleFilename: patch.sampleFilename,
          sampleStorageUrl: patch.sampleStorageUrl,
        },
      });
      return mapVoice(row);
    },
    async deleteRow(id, userId) {
      await prisma.voice.deleteMany({ where: { id, userId } });
    },
    async addCleanup(job) {
      await prisma.voiceCleanup.create({
        data: {
          userId: job.userId,
          providerVoiceId: job.providerVoiceId,
          sampleFilename: job.sampleFilename,
          sampleStorageUrl: job.sampleStorageUrl,
          voiceRowId: job.voiceRowId,
          status: "pending",
        },
      });
    },
    async pendingCleanups(limit) {
      const rows = await prisma.voiceCleanup.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        providerVoiceId: row.providerVoiceId,
        sampleFilename: row.sampleFilename,
        sampleStorageUrl: row.sampleStorageUrl,
        voiceRowId: row.voiceRowId,
        attempts: row.attempts,
        status: row.status === "done" || row.status === "failed" ? row.status : "pending",
      }));
    },
    async markCleanup(id, status, attempts, error) {
      await prisma.voiceCleanup.update({
        where: { id },
        data: { status, attempts, lastError: error ?? null },
      });
    },
    async storiesUsingVoice(userId, appVoiceId) {
      return prisma.story.count({ where: { userId, audioVoiceId: appVoiceId, OR: [{ audioUrl: { not: null } }, { audioFilename: { not: null } }] } });
    },
    async clearStoryAudio(userId, appVoiceId) {
      const rows = await prisma.story.findMany({
        where: { userId, audioVoiceId: appVoiceId },
        select: { id: true, audioFilename: true, audioUrl: true, audioStorageUrl: true },
      });
      for (const row of rows) {
        await removeStoryAudioFile(row);
      }
      const result = await prisma.story.updateMany({
        where: { userId, audioVoiceId: appVoiceId },
        data: CLEARED_STORY_AUDIO,
      });
      return result.count;
    },
    async deletePreviews(userId, appVoiceId) {
      const rows = await prisma.narrationPreview.findMany({
        where: { ownerUserId: userId, voiceAppId: appVoiceId },
        select: { id: true, filename: true, storageUrl: true },
      });
      for (const row of rows) {
        await deleteMediaReference({ folder: "voices", filename: row.filename, url: row.storageUrl });
        await prisma.narrationPreview.delete({ where: { id: row.id } });
      }
    },
  };
}

export async function listOwnedVoices(userId: string): Promise<StoredVoice[]> {
  const rows = await prisma.voice.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(mapVoice);
}

export async function findOwnedVoice(userId: string, id: string): Promise<StoredVoice | null> {
  const row = await prisma.voice.findFirst({ where: { id, userId } });
  return row ? mapVoice(row) : null;
}

export async function savePrivateSample(filename: string, bytes: Uint8Array, contentType: string) {
  const saved = await saveMediaBytes({
    folder: "voices",
    filename,
    body: Buffer.from(bytes),
    contentType,
    access: "private",
  });
  return { storageUrl: saved.access === "private" && saved.url.startsWith("http") ? saved.url : null };
}

export async function deletePrivateSample(filename: string | null, storageUrl: string | null) {
  await deleteMediaReference({ folder: "voices", filename, url: storageUrl });
}

export async function readOwnedSample(userId: string, filename: string): Promise<Buffer | null> {
  const row = await prisma.voice.findFirst({
    where: { userId, sampleFilename: filename },
    select: { sampleFilename: true, sampleStorageUrl: true },
  });
  if (!row) return null;
  return readPrivateMedia({ folder: "voices", filename: row.sampleFilename, storageUrl: row.sampleStorageUrl });
}
