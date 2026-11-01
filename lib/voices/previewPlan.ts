import { createHash } from "node:crypto";
import { normalizeAppLanguage, type AppLanguage } from "./language";
import { previewSpendAllowed } from "./limits";
import { PREVIEW_SCRIPT } from "./passages";
import { librarySample, type DefaultNarrator } from "./registry";
import { V3_USD_PER_THOUSAND_CHARS } from "@/lib/tts/pricing";
import { resolveTtsModelId } from "@/lib/tts/modelCapabilities";

/** Why a preview cannot be offered right now. The picker says so instead of playing anything else. */
export type PreviewUnavailableReason = "live_preview_off" | "no_provider_voice" | "daily_cap_reached";

export type PreviewPlan =
  | { action: "library"; cacheKey: string; paid: false; url: string; sampleModelId: string | null }
  | {
      action: "generate";
      cacheKey: string;
      paid: true;
      script: string;
      estimatedUsd: number;
      providerVoiceId: string;
      language: AppLanguage;
    }
  | { action: "unavailable"; cacheKey: string; paid: false; reason: PreviewUnavailableReason }
  | { action: "forbidden"; status: number; error: string };

export function voicePreviewCacheKey(input: {
  voiceAppId: string;
  voiceVersion: number;
  language: string;
  modelId: string;
  ownerId?: string | null;
}): string {
  const payload = [
    "preview",
    input.voiceAppId,
    String(input.voiceVersion),
    normalizeAppLanguage(input.language),
    input.modelId,
    input.ownerId || "shared",
    PREVIEW_SCRIPT[normalizeAppLanguage(input.language)],
  ].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function previewEstimateUsd(language: unknown): number {
  return (PREVIEW_SCRIPT[normalizeAppLanguage(language)].length / 1000) * V3_USD_PER_THOUSAND_CHARS;
}

/** Each live attempt counts at the dearest line, so a failed or timed-out call still uses up the daily cap. */
export const PREVIEW_ATTEMPT_CEILING_USD = Math.max(...(Object.keys(PREVIEW_SCRIPT) as AppLanguage[]).map(previewEstimateUsd));

/**
 * Story voices play the Voice Library sample for the requested language. Anything else is generated only when
 * live preview is switched on and today's attempts stay under the cap. Otherwise the answer is "unavailable".
 */
export function planVoicePreview(input: {
  voiceAppId: string;
  language: unknown;
  ownerId: string | null;
  voiceVersion: number;
  providerVoiceId: string | null;
  kind: "default" | "personal";
  selectable: boolean;
  narrator?: DefaultNarrator | null;
  spentTodayUsd?: number;
  env?: NodeJS.ProcessEnv;
}): PreviewPlan {
  if (!input.selectable) {
    return { action: "forbidden", status: 409, error: "That voice is not ready to preview." };
  }
  const language = normalizeAppLanguage(input.language);
  const modelId = resolveTtsModelId();
  const cacheKey = voicePreviewCacheKey({
    voiceAppId: input.voiceAppId,
    voiceVersion: input.voiceVersion,
    language,
    modelId,
    ownerId: input.ownerId,
  });
  if (input.kind === "default") {
    const sample = librarySample(input.narrator, language);
    if (sample) return { action: "library", cacheKey, paid: false, url: sample.url, sampleModelId: sample.modelId };
  }
  const spend = previewSpendAllowed(input.env);
  if (!spend.allow) return { action: "unavailable", cacheKey, paid: false, reason: "live_preview_off" };
  if (!input.providerVoiceId) return { action: "unavailable", cacheKey, paid: false, reason: "no_provider_voice" };
  const script = PREVIEW_SCRIPT[language];
  const estimatedUsd = previewEstimateUsd(language);
  const spent = Number.isFinite(input.spentTodayUsd) ? Math.max(0, Number(input.spentTodayUsd)) : Number.POSITIVE_INFINITY;
  if (spent + PREVIEW_ATTEMPT_CEILING_USD > spend.capUsd) {
    return { action: "unavailable", cacheKey, paid: false, reason: "daily_cap_reached" };
  }
  return {
    action: "generate",
    cacheKey,
    paid: true,
    script,
    estimatedUsd,
    providerVoiceId: input.providerVoiceId,
    language,
  };
}
