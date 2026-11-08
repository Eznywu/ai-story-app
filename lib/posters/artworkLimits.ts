import { createHash } from "node:crypto";
import { isGuestEmail } from "@/lib/auth/config";

export const DEFAULT_MAX_ATTEMPTS = 1;
export const DEFAULT_DAILY_GENERATIONS = 8;
export const DEFAULT_DAILY_SPEND_USD = 0.2;

export type ArtworkCaps = {
  maxAttempts: number;
  dailyGenerations: number;
  dailySpendUsd: number;
};

function positiveNumber(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

export function artworkCapsFromEnv(env: NodeJS.ProcessEnv = process.env): ArtworkCaps {
  return {
    maxAttempts: Math.max(1, Math.floor(positiveNumber(env.POSTER_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS))),
    dailyGenerations: Math.floor(
      positiveNumber(env.POSTER_DAILY_GENERATION_CAP, DEFAULT_DAILY_GENERATIONS)
    ),
    dailySpendUsd: positiveNumber(env.POSTER_DAILY_SPEND_CAP_USD, DEFAULT_DAILY_SPEND_USD),
  };
}

/**
 * Shared guest mode uses one user id for everyone. Limits need a separate
 * client key so one guest browser cannot spend another guest's allowance,
 * and so the shared id alone is not the bucket.
 */
export function artworkScopeKey(input: {
  userId: string;
  email: string;
  clientKey?: string | null;
}): string {
  if (!isGuestEmail(input.email)) return `family:${input.userId}`;
  const client = (input.clientKey ?? "").trim() || "missing-client";
  const hash = createHash("sha256").update(`${input.userId}\n${client}`).digest("hex").slice(0, 24);
  return `guest:${hash}`;
}

export function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
