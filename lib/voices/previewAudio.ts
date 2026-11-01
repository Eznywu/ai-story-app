import { createHash } from "node:crypto";
import { inspectMp3 } from "@/lib/tts/mp3Inspect";

/** SHA-256 of `lib/providers/fixtures/mock-narration.mp3`: a 36-second 220 Hz test tone, not speech. */
export const STAND_IN_TONE_SHA256 = "780c0e2e07ac658a0ca49e66232aa2101c1cd18166fb54d6885c235f080aab24";

export const PREVIEW_MIN_MS = 1200;
export const PREVIEW_MAX_MS = 45_000;
export const PREVIEW_MAX_BYTES = 2_000_000;

/** Only these cache rows can be replayed. Anything else (for example the old "mock" rows) is dropped on sight. */
export const SERVABLE_PREVIEW_SOURCES = ["library", "generated"] as const;
export type ServablePreviewSource = (typeof SERVABLE_PREVIEW_SOURCES)[number];

export type PreviewAudioProblem = "empty" | "too_large" | "stand_in" | "not_mp3" | "too_short" | "too_long";

export type PreviewAudioCheck = { ok: true; durationMs: number } | { ok: false; problem: PreviewAudioProblem };

export function audioFingerprint(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function isServablePreviewSource(source: string | null | undefined): source is ServablePreviewSource {
  return SERVABLE_PREVIEW_SOURCES.includes(source as ServablePreviewSource);
}

/**
 * A preview has to be a whole MP3 of plausible speech length. The bundled test tone is refused even when a
 * mock provider returned it as if it were generated. Frame headers are counted; the audio is not decoded.
 */
export function checkPreviewAudio(
  bytes: Buffer,
  standIns: ReadonlySet<string> = new Set([STAND_IN_TONE_SHA256])
): PreviewAudioCheck {
  if (!bytes.length) return { ok: false, problem: "empty" };
  if (bytes.length > PREVIEW_MAX_BYTES) return { ok: false, problem: "too_large" };
  if (standIns.has(audioFingerprint(bytes))) return { ok: false, problem: "stand_in" };
  const mp3 = inspectMp3(bytes);
  if (!mp3.valid) return { ok: false, problem: "not_mp3" };
  if (mp3.durationMs < PREVIEW_MIN_MS) return { ok: false, problem: "too_short" };
  if (mp3.durationMs > PREVIEW_MAX_MS) return { ok: false, problem: "too_long" };
  return { ok: true, durationMs: mp3.durationMs };
}

/** Whether a cached row may be replayed as a preview: a real source and audio that still passes the check. */
export function cachedPreviewUsable(source: string | null | undefined, bytes: Buffer | null): boolean {
  if (!isServablePreviewSource(source) || !bytes) return false;
  return checkPreviewAudio(bytes).ok;
}
