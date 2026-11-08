export const MIN_RECORDING_MS = 10_000;
export const MAX_RECORDING_MS = 180_000;
export const TARGET_RECORDING_MIN_MS = 60_000;
export const TARGET_RECORDING_MAX_MS = 120_000;
export const MIN_VOICED_MS = 8_000;
export const MIN_SAMPLE_BYTES = 8_000;
export const MAX_SAMPLE_BYTES = 12_000_000;
const MIN_BYTES_PER_SECOND = 200;
const MAX_BYTES_PER_SECOND = 256_000;

export const RECORDER_MIME_CANDIDATES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export type SniffedAudio = {
  format: "webm" | "mp4" | "mpeg" | "wav" | "ogg";
  extension: "webm" | "m4a" | "mp3" | "wav" | "ogg";
};

export function preferredRecorderMime(isTypeSupported: (mime: string) => boolean): string {
  return RECORDER_MIME_CANDIDATES.find((mime) => isTypeSupported(mime)) ?? "";
}

export function sniffAudio(bytes: Uint8Array): SniffedAudio | null {
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { format: "webm", extension: "webm" };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WAVE") {
    return { format: "wav", extension: "wav" };
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === "OggS") {
    return { format: "ogg", extension: "ogg" };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    return { format: "mp4", extension: "m4a" };
  }
  if (bytes.length >= 3 && ascii(bytes, 0, 3) === "ID3") {
    return { format: "mpeg", extension: "mp3" };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return { format: "mpeg", extension: "mp3" };
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

export type UploadCheck =
  | { ok: true; audio: SniffedAudio; durationMs: number; voicedMs: number }
  | { ok: false; code: "empty" | "format" | "size" | "duration" | "silence" | "clipping" | "mismatch"; message: string };

export function checkVoiceUpload(input: {
  bytes: Uint8Array;
  durationMs: number;
  voicedMs: number;
  clipped: boolean;
}): UploadCheck {
  if (!input.bytes.length) {
    return { ok: false, code: "empty", message: "The recording was empty. Please record again." };
  }
  const audio = sniffAudio(input.bytes);
  if (!audio) {
    return {
      ok: false,
      code: "format",
      message: "That recording format is not supported. Use the recorder in this app and try again.",
    };
  }
  if (input.bytes.length < MIN_SAMPLE_BYTES || input.bytes.length > MAX_SAMPLE_BYTES) {
    return {
      ok: false,
      code: "size",
      message: "That recording is the wrong size. Please record about one to two minutes and try again.",
    };
  }
  if (!Number.isFinite(input.durationMs) || input.durationMs < MIN_RECORDING_MS || input.durationMs > MAX_RECORDING_MS) {
    return {
      ok: false,
      code: "duration",
      message: "Please record at least 10 seconds, and keep it under three minutes. One to two minutes is the goal.",
    };
  }
  const bytesPerSecond = input.bytes.length / (input.durationMs / 1000);
  if (bytesPerSecond < MIN_BYTES_PER_SECOND || bytesPerSecond > MAX_BYTES_PER_SECOND) {
    return {
      ok: false,
      code: "mismatch",
      message: "The recording length does not match the file. Please record again.",
    };
  }
  if (!Number.isFinite(input.voicedMs) || input.voicedMs < MIN_VOICED_MS) {
    return {
      ok: false,
      code: "silence",
      message: "There was not enough speech in that take. Move closer and read the passage again.",
    };
  }
  if (input.clipped) {
    return {
      ok: false,
      code: "clipping",
      message: "That take was too loud and clipped. Hold the phone a little farther away and record again.",
    };
  }
  return { ok: true, audio, durationMs: Math.round(input.durationMs), voicedMs: Math.round(input.voicedMs) };
}

/** Share of frames whose level is above a quiet-room threshold. Levels are 0–1 RMS. */
export function voicedDurationMs(levels: number[], elapsedMs: number, threshold = 0.02): number {
  if (!levels.length || elapsedMs <= 0) return 0;
  const voiced = levels.filter((level) => level >= threshold).length;
  return Math.round((voiced / levels.length) * elapsedMs);
}

/** True when too many peaks sit against the top of the range. Peaks are absolute 0–1. */
export function recordingClipped(peaks: number[], limit = 0.98, share = 0.02): boolean {
  if (peaks.length < 8) return false;
  const hot = peaks.filter((peak) => peak >= limit).length;
  return hot / peaks.length >= share;
}
