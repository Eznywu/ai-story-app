import { createHash } from "node:crypto";
import { normalizeAppLanguage, type AppLanguage } from "./language";
import { previewSpendAllowed } from "./limits";
import { PREVIEW_SCRIPT } from "./passages";
import { defaultNarratorById, libraryPreviewUrl, type DefaultNarrator } from "./registry";
import { V3_USD_PER_THOUSAND_CHARS } from "@/lib/tts/pricing";
import { resolveTtsModelId } from "@/lib/tts/modelCapabilities";

export type PreviewPlan =
  | { action: "library"; url: string; cacheKey: string; paid: false }
  | { action: "cache"; cacheKey: string; paid: false }
  | { action: "mock"; cacheKey: string; paid: false; script: string }
  | { action: "forbidden"; status: number; error: string }
  | {
      action: "generate";
      cacheKey: string;
      paid: true;
      script: string;
      estimatedUsd: number;
      providerVoiceId: string;
      language: AppLanguage;
    };

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

export function planVoicePreview(input: {
  voiceAppId: string;
  language: unknown;
  ownerId: string | null;
  voiceVersion: number;
  providerVoiceId: string | null;
  kind: "default" | "personal";
  selectable: boolean;
  cached: boolean;
  narrator?: DefaultNarrator | null;
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
  if (input.cached) return { action: "cache", cacheKey, paid: false };
  const narrator = input.narrator ?? (input.kind === "default" ? defaultNarratorById(input.voiceAppId) : null);
  if (narrator) {
    const url = libraryPreviewUrl(narrator, language);
    if (url) return { action: "library", url, cacheKey, paid: false };
  }
  const spend = previewSpendAllowed(input.env);
  const script = PREVIEW_SCRIPT[language];
  if (!spend.allow || !input.providerVoiceId) {
    return { action: "mock", cacheKey, paid: false, script };
  }
  const estimatedUsd = (script.length / 1000) * V3_USD_PER_THOUSAND_CHARS;
  if (estimatedUsd > spend.capUsd) {
    return { action: "mock", cacheKey, paid: false, script };
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
