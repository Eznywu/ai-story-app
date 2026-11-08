/**
 * Illustration cost for gpt-image-2.5-flare. This is not a provider invoice
 * until a response includes token usage.
 *
 * Production default, checked 8 Nov 2026:
 * - One provider: OpenAI Images API, model `gpt-image-2.5-flare`.
 *   Quality `medium`, size `1024x1024`, overridable with
 *   `OPENAI_POSTER_IMAGE_QUALITY`. There is no automatic retry.
 *   Docs: https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
 *   Guide: https://developers.openai.com/api/docs/guides/image-generation
 * - Flare is token-billed. It does not have the GPT Image 2 per-image table
 *   (low 1024×1024 $0.006, medium $0.053, high $0.211). Those stand-in prices
 *   must not be shown as Flare prices.
 *   Text input $5 / 1M, image output $30 / 1M, image input $8 / 1M.
 *   https://developers.openai.com/api/docs/pricing
 * - The locked medium reference (lib/posters/fixtures/references/
 *   lulu-lantern-path-medium.json, 8 Nov 2026) used 546 text-input tokens and
 *   439 image-output tokens, and no image-input tokens:
 *   546 × $5/1M + 439 × $30/1M = $0.0159, about 1.6 US cents.
 * - A character reference, when one can be loaded, is sent once on
 *   `images.edit`. Image-input tokens are extra at $8 / 1M. The file is
 *   scaled to fit inside 512×512 first so that count stays smaller than a
 *   full 1024 illustration. `input_fidelity` is left at the API default
 *   `low`; `high` is not requested, because it spends more to match photo
 *   faces and these characters are storybook drawings. The exact extra cost
 *   is the image-input token count on the response, not a fixed add-on.
 *
 * Gemini is not called in production unless `POSTER_IMAGE_PROVIDER=gemini`
 * selects it as the single provider. Dual-provider comparison requires
 * `POSTER_BENCHMARK=1` outside production.
 */

export const PRODUCTION_IMAGE_PROVIDER = "openai";
export const PRODUCTION_IMAGE_MODEL = "gpt-image-2.5-flare";
export const PRODUCTION_IMAGE_QUALITY = "medium";
export const PRODUCTION_IMAGE_SIZE = "1024x1024";

export const BENCHMARK_GEMINI_MODEL = "gemini-3.1-flash-lite-image";

export const FLARE_TEXT_INPUT_USD_PER_MILLION = 5;
export const FLARE_IMAGE_OUTPUT_USD_PER_MILLION = 30;
export const FLARE_IMAGE_INPUT_USD_PER_MILLION = 8;

const TEXT_INPUT_USD_PER_TOKEN = FLARE_TEXT_INPUT_USD_PER_MILLION / 1_000_000;
const IMAGE_OUTPUT_USD_PER_TOKEN = FLARE_IMAGE_OUTPUT_USD_PER_MILLION / 1_000_000;
const IMAGE_INPUT_USD_PER_TOKEN = FLARE_IMAGE_INPUT_USD_PER_MILLION / 1_000_000;

/** Longest edge of a character reference before it is sent as image input. */
export const REFERENCE_IMAGE_MAX_EDGE = 512;

export type FlareTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  textInputTokens?: number;
  imageInputTokens?: number;
  imageOutputTokens?: number;
};

/** Measured 8 Nov 2026 medium square. The planning reserve for everyday quality. */
export const FLARE_MEDIUM_REFERENCE_USAGE: FlareTokenUsage = {
  inputTokens: 546,
  outputTokens: 439,
  textInputTokens: 546,
  imageInputTokens: 0,
  imageOutputTokens: 439,
};

/**
 * Spend reservation before usage arrives. Not a Flare tariff and not the
 * GPT Image 2 per-image table. Low and medium reserve the measured medium
 * reference. High and auto reserve four times that measurement so an
 * unpriced upgrade cannot pass a tight daily cap unnoticed.
 */
const UNMEASURED_QUALITY_RESERVE_MULTIPLIER = 4;

export function flareUsdFromTokens(usage: FlareTokenUsage): number {
  const imageIn = usage.imageInputTokens ?? 0;
  const textIn = usage.textInputTokens ?? Math.max(0, (usage.inputTokens ?? 0) - imageIn);
  const imageOut = usage.imageOutputTokens ?? usage.outputTokens ?? 0;
  return roundUsd(
    textIn * TEXT_INPUT_USD_PER_TOKEN +
      imageIn * IMAGE_INPUT_USD_PER_TOKEN +
      imageOut * IMAGE_OUTPUT_USD_PER_TOKEN
  );
}

export const FLARE_MEDIUM_REFERENCE_USD = flareUsdFromTokens(FLARE_MEDIUM_REFERENCE_USAGE);

function hasTokenUsage(usage: FlareTokenUsage | null | undefined): usage is FlareTokenUsage {
  if (!usage) return false;
  return (
    (usage.inputTokens ?? 0) > 0 ||
    (usage.outputTokens ?? 0) > 0 ||
    (usage.textInputTokens ?? 0) > 0 ||
    (usage.imageInputTokens ?? 0) > 0 ||
    (usage.imageOutputTokens ?? 0) > 0
  );
}

function planningReserveUsd(quality: string): number {
  if (quality === "high" || quality === "auto" || quality === "xhigh" || quality === "max") {
    return roundUsd(FLARE_MEDIUM_REFERENCE_USD * UNMEASURED_QUALITY_RESERVE_MULTIPLIER);
  }
  return FLARE_MEDIUM_REFERENCE_USD;
}

export function estimatedImageUsd(input: {
  quality: string;
  usage?: FlareTokenUsage | null;
}): number {
  if (hasTokenUsage(input.usage)) return flareUsdFromTokens(input.usage);
  return planningReserveUsd(input.quality);
}

export function roundUsd(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

const POSTER_QUALITIES = new Set(["low", "medium", "high", "auto"]);

/** Real generation quality. Unset means medium. `hd` maps to high. */
export function posterImageQuality(
  env: NodeJS.ProcessEnv | { OPENAI_POSTER_IMAGE_QUALITY?: string } = process.env
): "low" | "medium" | "high" | "auto" {
  const raw = env.OPENAI_POSTER_IMAGE_QUALITY?.trim().toLowerCase();
  if (raw && POSTER_QUALITIES.has(raw)) return raw as "low" | "medium" | "high" | "auto";
  if (raw === "hd") return "high";
  return PRODUCTION_IMAGE_QUALITY;
}

export function posterBenchmarkEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return env.POSTER_BENCHMARK === "1";
}

/** Production uses one provider. Unset or `auto` means OpenAI, with no second provider. */
export function selectedImageProvider(env: NodeJS.ProcessEnv = process.env): "openai" | "gemini" {
  const mode = env.POSTER_IMAGE_PROVIDER?.trim().toLowerCase();
  if (mode === "gemini") return "gemini";
  return "openai";
}
