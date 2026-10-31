/**
 * ElevenLabs `voice_settings.speed` accepts about 0.7–1.2.
 * This is the recording pace. It is not the player's playback speed.
 */
export const TTS_SPEED_MIN = 0.7;
export const TTS_SPEED_MAX = 1.2;
export const TTS_SPEED_STEP = 0.05;
export const TTS_SPEED_DEFAULT = 0.9;

/** Player control only. These values are never sent to ElevenLabs. */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

export function clampTtsSpeed(speed: number): number {
  const n = Number(speed);
  if (!Number.isFinite(n)) return TTS_SPEED_DEFAULT;
  return Math.max(TTS_SPEED_MIN, Math.min(TTS_SPEED_MAX, Number(n.toFixed(2))));
}
