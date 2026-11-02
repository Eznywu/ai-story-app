import { randomBytes } from "node:crypto";
import { CLEANUP_MAX_ATTEMPTS } from "./limits";
import { checkVoiceUpload } from "./recordingChecks";
import { providerLanguageLabel, resolveRecordingMetadata, type RecordingLocale } from "./recordingScripts";
import { consentAllowsCreate, quotaAllowsCreate, type VoiceStatus } from "./decisions";

export type StoredVoice = {
  id: string;
  userId: string;
  displayName: string;
  /** Recording locale for new rows. Older rows may still be en or zh-Hant. */
  language: string;
  recordingLocale: string | null;
  scriptVersion: string | null;
  status: VoiceStatus;
  voiceVersion: number;
  requiresVerification: boolean;
  providerVoiceId: string;
  idempotencyKey: string | null;
  consentTextVersion: string | null;
  sampleFilename: string | null;
  sampleStorageUrl: string | null;
};

export type CleanupJob = {
  id: string;
  userId: string;
  providerVoiceId: string;
  sampleFilename: string | null;
  sampleStorageUrl: string | null;
  voiceRowId: string | null;
  attempts: number;
  status: "pending" | "done" | "failed";
};

export type VoiceStore = {
  findByIdempotency(userId: string, key: string): Promise<StoredVoice | null>;
  countActive(userId: string): Promise<number>;
  countAttemptsSince(userId: string, since: Date): Promise<number>;
  recordAttempt(userId: string, now: Date): Promise<void>;
  insert(voice: StoredVoice & { consentAt: Date }): Promise<void>;
  update(id: string, userId: string, patch: Partial<Pick<StoredVoice, "displayName" | "status" | "sampleFilename" | "sampleStorageUrl">>): Promise<StoredVoice | null>;
  deleteRow(id: string, userId: string): Promise<void>;
  addCleanup(job: Omit<CleanupJob, "id" | "attempts" | "status"> & { id?: string }): Promise<void>;
  pendingCleanups(limit: number): Promise<CleanupJob[]>;
  markCleanup(id: string, status: "pending" | "done" | "failed", attempts: number, error?: string): Promise<void>;
  storiesUsingVoice(userId: string, appVoiceId: string): Promise<number>;
  clearStoryAudio(userId: string, appVoiceId: string): Promise<number>;
  /** Cached preview clips spoken in this personal voice. */
  deletePreviews(userId: string, appVoiceId: string): Promise<void>;
};

export type VoiceCloneProvider = {
  createClone(input: {
    name: string;
    bytes: Uint8Array;
    filename: string;
    contentType: string;
    languageLabel: { language: string; accent: string; description: string };
  }): Promise<{
    providerVoiceId: string;
    requiresVerification: boolean;
  }>;
  deleteVoice(providerVoiceId: string): Promise<void>;
  subscription(): Promise<{ voiceLimit: number | null; slotsUsed: number | null }>;
};

export type CreateVoiceResult =
  | { ok: true; voice: StoredVoice; replayed: boolean }
  | { ok: false; status: number; error: string };

function newId(): string {
  return `v_${randomBytes(12).toString("hex")}`;
}

export function sampleObjectName(extension: string): string {
  return `voice_${randomBytes(8).toString("hex")}.${extension}`;
}

export async function createPersonalVoice(
  input: {
    userId: string;
    idempotencyKey: string;
    name: string;
    language: unknown;
    recordingLocale?: unknown;
    scriptVersion?: unknown;
    bytes: Uint8Array;
    durationMs: number;
    voicedMs: number;
    clipped: boolean;
    consentAccepted: unknown;
    consentTextVersion: unknown;
    contentType: string;
  },
  deps: {
    store: VoiceStore;
    provider: VoiceCloneProvider;
    now: Date;
    saveSample: (filename: string, bytes: Uint8Array, contentType: string) => Promise<{ storageUrl: string | null }>;
    deleteSample: (filename: string | null, storageUrl: string | null) => Promise<void>;
    env?: NodeJS.ProcessEnv;
  }
): Promise<CreateVoiceResult> {
  const consent = consentAllowsCreate({ accepted: input.consentAccepted, textVersion: input.consentTextVersion });
  if (!consent.ok) return consent;
  const key = input.idempotencyKey.trim();
  if (!key || key.length > 80) {
    return { ok: false, status: 400, error: "An idempotency key is required so a retry cannot create a second voice." };
  }
  const existing = await deps.store.findByIdempotency(input.userId, key);
  if (existing) return { ok: true, voice: existing, replayed: true };

  const upload = checkVoiceUpload({
    bytes: input.bytes,
    durationMs: input.durationMs,
    voicedMs: input.voicedMs,
    clipped: input.clipped,
  });
  if (!upload.ok) return { ok: false, status: 400, error: upload.message };

  const recorded = resolveRecordingMetadata({
    recordingLocale: input.recordingLocale,
    scriptVersion: input.scriptVersion,
    language: input.language,
  });
  if (!recorded.ok) return recorded;

  const since = new Date(deps.now.getTime() - 60 * 60 * 1000);
  const [activeCount, attempts, slots] = await Promise.all([
    deps.store.countActive(input.userId),
    deps.store.countAttemptsSince(input.userId, since),
    deps.provider.subscription(),
  ]);
  const quota = quotaAllowsCreate({
    activeCount,
    attemptsInLastHour: attempts,
    voiceLimit: slots.voiceLimit,
    slotsUsed: slots.slotsUsed,
    env: deps.env,
  });
  if (!quota.ok) return quota;

  await deps.store.recordAttempt(input.userId, deps.now);
  const displayName = input.name.trim().slice(0, 80) || "My voice";
  const language: RecordingLocale = recorded.locale;
  const filename = sampleObjectName(upload.audio.extension);
  const saved = await deps.saveSample(filename, input.bytes, input.contentType || "application/octet-stream");
  let created: { providerVoiceId: string; requiresVerification: boolean };
  try {
    created = await deps.provider.createClone({
      name: displayName,
      bytes: input.bytes,
      filename,
      contentType: input.contentType || "application/octet-stream",
      languageLabel: providerLanguageLabel(language),
    });
  } catch (error) {
    await deps.deleteSample(filename, saved.storageUrl);
    const message = error instanceof Error && error.message ? error.message : "The voice service could not create a voice.";
    return { ok: false, status: 502, error: message };
  }

  const voice: StoredVoice & { consentAt: Date } = {
    id: newId(),
    userId: input.userId,
    displayName,
    language,
    recordingLocale: language,
    scriptVersion: recorded.scriptVersion,
    status: created.requiresVerification ? "pending_verification" : "ready",
    voiceVersion: 1,
    requiresVerification: created.requiresVerification,
    providerVoiceId: created.providerVoiceId,
    idempotencyKey: key,
    consentTextVersion: String(input.consentTextVersion),
    consentAt: deps.now,
    sampleFilename: filename,
    sampleStorageUrl: saved.storageUrl,
  };
  try {
    await deps.store.insert(voice);
  } catch {
    let deleted = false;
    try {
      await deps.provider.deleteVoice(created.providerVoiceId);
      deleted = true;
    } catch {
      deleted = false;
    }
    await deps.deleteSample(filename, saved.storageUrl).catch(() => {});
    if (!deleted) {
      await deps.store.addCleanup({
        userId: input.userId,
        providerVoiceId: created.providerVoiceId,
        sampleFilename: filename,
        sampleStorageUrl: saved.storageUrl,
        voiceRowId: null,
      });
    }
    return { ok: false, status: 500, error: "The voice could not be saved. Nothing was left attached to this account." };
  }
  return { ok: true, voice, replayed: false };
}

export async function deletePersonalVoice(
  input: { userId: string; voiceId: string; deleteGeneratedAudio: boolean },
  deps: {
    store: VoiceStore;
    provider: VoiceCloneProvider;
    findOwned: (userId: string, voiceId: string) => Promise<StoredVoice | null>;
    deleteSample: (filename: string | null, storageUrl: string | null) => Promise<void>;
  }
): Promise<
  | {
      ok: true;
      removed: boolean;
      recordingsCleared: number;
      recordingsKept: number;
      cleanupPending: boolean;
      message: string;
    }
  | { ok: false; status: number; error: string }
> {
  const voice = await deps.findOwned(input.userId, input.voiceId);
  if (!voice) return { ok: false, status: 404, error: "That voice is not on this account." };
  await deps.store.update(voice.id, input.userId, { status: "deleting" });
  // Local copies go first. If one fails, the voice still exists and the person can simply try again.
  const kept = await deps.store.storiesUsingVoice(input.userId, voice.id);
  let cleared = 0;
  try {
    await deps.store.deletePreviews(input.userId, voice.id);
    if (input.deleteGeneratedAudio) cleared = await deps.store.clearStoryAudio(input.userId, voice.id);
  } catch {
    await deps.store.update(voice.id, input.userId, { status: "delete_failed" });
    return {
      ok: false,
      status: 502,
      error: "Some saved clips of this voice could not be deleted yet. New narration with it is blocked. Please try again.",
    };
  }
  try {
    if (voice.providerVoiceId) {
      await deps.provider.deleteVoice(voice.providerVoiceId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete failed";
    await deps.store.update(voice.id, input.userId, { status: "delete_failed" });
    await deps.store.addCleanup({
      userId: input.userId,
      providerVoiceId: voice.providerVoiceId,
      sampleFilename: voice.sampleFilename,
      sampleStorageUrl: voice.sampleStorageUrl,
      voiceRowId: voice.id,
    });
    return {
      ok: true,
      removed: false,
      recordingsCleared: cleared,
      recordingsKept: Math.max(0, kept - cleared),
      cleanupPending: true,
      message: `New narration with this voice is blocked. The voice service could not delete it yet (${message}). A retry is saved. Story text is unchanged.`,
    };
  }
  const sampleDeleted = await deps
    .deleteSample(voice.sampleFilename, voice.sampleStorageUrl)
    .then(() => true)
    .catch(() => false);
  if (!sampleDeleted) {
    // The provider clone is already gone, so only the recorded sample needs the retry job.
    await deps.store.addCleanup({
      userId: input.userId,
      providerVoiceId: "",
      sampleFilename: voice.sampleFilename,
      sampleStorageUrl: voice.sampleStorageUrl,
      voiceRowId: null,
    });
  }
  await deps.store.deleteRow(voice.id, input.userId);
  return {
    ok: true,
    removed: true,
    recordingsCleared: cleared,
    recordingsKept: input.deleteGeneratedAudio ? Math.max(0, kept - cleared) : kept,
    cleanupPending: false,
    message: input.deleteGeneratedAudio
      ? "The voice and the recordings made with it are deleted. The story text is still there."
      : "The voice is deleted, so it cannot make a new recording. Stories keep their text. Older recordings made with this voice are still there until you delete them.",
  };
}

export async function retryVoiceCleanups(
  deps: {
    store: VoiceStore;
    provider: VoiceCloneProvider;
    deleteSample: (filename: string | null, storageUrl: string | null) => Promise<void>;
  },
  limit = 10
): Promise<{ done: number; pending: number }> {
  const jobs = await deps.store.pendingCleanups(limit);
  let done = 0;
  let pending = 0;
  for (const job of jobs) {
    if (job.attempts >= CLEANUP_MAX_ATTEMPTS) {
      await deps.store.markCleanup(job.id, "failed", job.attempts, "Gave up after the retry limit.");
      pending += 1;
      continue;
    }
    try {
      if (job.providerVoiceId) await deps.provider.deleteVoice(job.providerVoiceId);
      await deps.deleteSample(job.sampleFilename, job.sampleStorageUrl);
      if (job.voiceRowId) await deps.store.deleteRow(job.voiceRowId, job.userId);
      await deps.store.markCleanup(job.id, "done", job.attempts + 1);
      done += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "cleanup failed";
      await deps.store.markCleanup(job.id, "pending", job.attempts + 1, message);
      pending += 1;
    }
  }
  return { done, pending };
}
