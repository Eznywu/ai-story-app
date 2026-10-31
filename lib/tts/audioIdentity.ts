export type SavedAudioIdentity = {
  audioUrl?: string | null;
  audioCacheKey?: string | null;
  audioVoiceId?: string | null;
  audioModelId?: string | null;
  audioConfigVersion?: string | null;
  audioDictionaryVersion?: string | null;
  audioLanguage?: string | null;
  audioSpeed?: number | null;
};

export type AudioIdentityRequest = {
  voiceId: string;
  speed: number;
  language: string;
};

export type AudioIdentityStatus = "missing" | "fresh" | "stale" | "unknown";

export function savedAudioIdentityStatus(
  saved: SavedAudioIdentity | null | undefined,
  request: AudioIdentityRequest,
  expected: { configVersion: string; dictionaryVersion: string; modelId: string }
): AudioIdentityStatus {
  if (!saved?.audioUrl) return "missing";
  if (!request.voiceId) return "unknown";
  if (!saved.audioCacheKey) return "stale";
  if (saved.audioConfigVersion !== expected.configVersion) return "stale";
  if (saved.audioDictionaryVersion !== expected.dictionaryVersion) return "stale";
  if (saved.audioModelId !== expected.modelId) return "stale";
  if ((saved.audioLanguage || "") !== request.language) return "stale";
  if ((saved.audioVoiceId || "") !== request.voiceId) return "stale";
  if (!Number.isFinite(saved.audioSpeed) || Math.abs(Number(saved.audioSpeed) - request.speed) > 0.001) return "stale";
  return "fresh";
}
