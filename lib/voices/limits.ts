export const DEFAULT_PERSONAL_VOICE_LIMIT = 2;
export const DEFAULT_CLONE_ATTEMPTS_PER_HOUR = 3;
export const CLEANUP_MAX_ATTEMPTS = 5;

export function personalVoiceLimit(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.PERSONAL_VOICE_LIMIT);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_PERSONAL_VOICE_LIMIT;
  return Math.min(30, Math.floor(raw));
}

export function cloneAttemptsPerHour(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.VOICE_CLONE_ATTEMPTS_PER_HOUR);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_CLONE_ATTEMPTS_PER_HOUR;
  return Math.min(20, Math.floor(raw));
}

/**
 * Live preview generation is off unless both the flag and a positive daily cap are set.
 * Unset, blank, and zero stay off so a missing budget cannot spend.
 */
export function previewSpendAllowed(env: NodeJS.ProcessEnv = process.env): { allow: boolean; capUsd: number } {
  const flag = (env.VOICE_PREVIEW_LIVE ?? "").trim().toLowerCase();
  const live = flag === "1" || flag === "true" || flag === "yes";
  const cap = Number(env.VOICE_PREVIEW_DAILY_CAP_USD);
  if (!live || !Number.isFinite(cap) || cap <= 0) return { allow: false, capUsd: 0 };
  return { allow: true, capUsd: cap };
}

export function slotCeilingBlocks(input: {
  voiceLimit: number | null;
  slotsUsed: number | null;
  personalCount: number;
}): boolean {
  if (input.voiceLimit == null || input.slotsUsed == null) return false;
  return input.slotsUsed >= input.voiceLimit;
}
