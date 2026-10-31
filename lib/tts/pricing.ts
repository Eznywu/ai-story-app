import { BENCHMARK_CASES } from "./benchmarkCases";
import { buildNarrationScript } from "./narrationScript";
import { COMPARISON_CONFIG_IDS } from "./config";
import { getModelCapability } from "./modelCapabilities";
import type { PronunciationDictionary } from "./pronunciationDictionary";

/**
 * Prices read from https://elevenlabs.io/pricing/api on 2026-10-27.
 * Text to Speech: $0.08 per 1,000 characters for v3 and Multilingual v2.
 * Flash / Turbo: $0.04 per 1,000 characters.
 * Scribe v2 speech to text: $0.22 per hour.
 * The models page says eleven_v3's 5,000 character limit is about 5 minutes,
 * so this estimate uses 1 minute of audio per 1,000 characters.
 */
export const PRICING_PAGE = "https://elevenlabs.io/pricing/api";
export const V3_USD_PER_THOUSAND_CHARS = 0.08;
export const SCRIBE_V2_USD_PER_HOUR = 0.22;
export const ESTIMATED_MINUTES_PER_THOUSAND_CHARS = 1;

export type LiveCostEstimate = {
  label: "estimate";
  pricedAt: "2026-10-27";
  pricingPage: string;
  modelId: string;
  configs: number;
  cases: number;
  charactersPerConfig: number;
  totalCharacters: number;
  ttsUsd: number;
  estimatedAudioMinutes: number;
  sttUsd: number;
  totalUsd: number;
  suggestedCapUsd: number;
  math: string;
};

export function estimateBenchmarkLiveCost(dictionary: PronunciationDictionary, modelId = "eleven_v3"): LiveCostEstimate {
  const capability = getModelCapability(modelId);
  const usdPerThousand = capability.modelId === "eleven_flash_v2_5" ? 0.04 : V3_USD_PER_THOUSAND_CHARS;
  const charactersPerConfig = BENCHMARK_CASES.reduce((sum, item) => {
    return sum + buildNarrationScript(item.text, item.language, dictionary).script.length;
  }, 0);
  const configs = COMPARISON_CONFIG_IDS.length;
  const totalCharacters = charactersPerConfig * configs;
  const ttsUsd = (totalCharacters / 1000) * usdPerThousand;
  const estimatedAudioMinutes = (totalCharacters / 1000) * ESTIMATED_MINUTES_PER_THOUSAND_CHARS;
  const sttUsd = (estimatedAudioMinutes / 60) * SCRIBE_V2_USD_PER_HOUR;
  const totalUsd = roundCents(ttsUsd + sttUsd);
  const suggestedCapUsd = roundCents(totalUsd * 1.2);
  return {
    label: "estimate",
    pricedAt: "2026-10-27",
    pricingPage: PRICING_PAGE,
    modelId,
    configs,
    cases: BENCHMARK_CASES.length,
    charactersPerConfig,
    totalCharacters,
    ttsUsd: roundCents(ttsUsd),
    estimatedAudioMinutes: Math.round(estimatedAudioMinutes * 100) / 100,
    sttUsd: roundCents(sttUsd),
    totalUsd,
    suggestedCapUsd,
    math: `${charactersPerConfig} characters in ${BENCHMARK_CASES.length} scripts × ${configs} configs = ${totalCharacters} characters. TTS ${totalCharacters}/1000 × $${usdPerThousand} = $${roundCents(ttsUsd)}. Audio estimate ${estimatedAudioMinutes.toFixed(2)} minutes from the models page (about 1 minute per 1,000 characters). Scribe v2 ${estimatedAudioMinutes.toFixed(2)}/60 × $${SCRIBE_V2_USD_PER_HOUR} = $${roundCents(sttUsd)}.`,
  };
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
