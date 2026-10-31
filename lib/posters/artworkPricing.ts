/**
 * Estimated illustration cost. This is not a provider invoice.
 *
 * Production default, checked 31 Oct 2026:
 * - One provider: OpenAI Images API, model `gpt-image-2.5-flare`
 *   (fast everyday model; not in the 1 Dec 2026 shutdown list).
 *   Quality `low`, size `1024x1024`.
 *   Docs: https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
 *   Guide: https://developers.openai.com/api/docs/guides/image-generation
 * - Token rates (same for Flare and Sunburst): image output $30 / 1M,
 *   text input $5 / 1M.
 *   https://developers.openai.com/api/docs/pricing
 * - OpenAI does not publish a fixed per-image price for Flare. The image
 *   guide's GPT Image 2 table lists low 1024×1024 image output at $0.006,
 *   on the same $30 / 1M output rate. That figure is the estimate when the
 *   response has no usage. Text input is extra and usually small.
 * - Higher quality is an explicit upgrade (`OPENAI_POSTER_IMAGE_QUALITY` or
 *   `OPENAI_POSTER_IMAGE_MODEL=gpt-image-2.5-sunburst`). GPT Image 2 published
 *   stand-ins: medium 1024×1024 $0.053, high $0.211.
 * - `gpt-image-1-mini` ($0.005 low square) and `gpt-image-1.5` shut down on
 *   1 Dec 2026. `dall-e-3` shut down 12 May 2026. `gpt-image-1` shut down
 *   23 Oct 2026.
 *   https://developers.openai.com/api/docs/deprecations
 *
 * Gemini is not called in production unless `POSTER_IMAGE_PROVIDER=gemini`
 * selects it as the single provider. Dual-provider comparison requires
 * `POSTER_BENCHMARK=1` outside production.
 * Imagen 4 (`imagen-4.0-fast-generate-001` and family) shut down in the
 * Gemini API on 17 Aug 2026.
 * Gemini 2.5 Flash Image is $0.039 per image up to 1024×1024 and shuts down
 * 15 Mar 2027. Gemini 3.1 Flash Lite Image is the listed efficiency model at
 * about $0.0336 per 1K image (1120 output tokens at $30 / 1M).
 * https://ai.google.dev/gemini-api/docs/pricing
 */

export const PRODUCTION_IMAGE_PROVIDER = "openai";
export const PRODUCTION_IMAGE_MODEL = "gpt-image-2.5-flare";
export const PRODUCTION_IMAGE_QUALITY = "low";
export const PRODUCTION_IMAGE_SIZE = "1024x1024";

export const BENCHMARK_GEMINI_MODEL = "gemini-3.1-flash-lite-image";

const QUALITY_STAND_IN_USD: Record<string, number> = {
  low: 0.006,
  medium: 0.053,
  high: 0.211,
  xhigh: 0.211,
  max: 0.211,
  auto: 0.053,
};

const IMAGE_OUTPUT_USD_PER_TOKEN = 30 / 1_000_000;
const TEXT_INPUT_USD_PER_TOKEN = 5 / 1_000_000;

export function estimatedImageUsd(input: {
  quality: string;
  usage?: { inputTokens?: number; outputTokens?: number } | null;
}): number {
  const usage = input.usage;
  if (usage && (usage.outputTokens || usage.inputTokens)) {
    const output = (usage.outputTokens ?? 0) * IMAGE_OUTPUT_USD_PER_TOKEN;
    const text = (usage.inputTokens ?? 0) * TEXT_INPUT_USD_PER_TOKEN;
    return roundUsd(output + text);
  }
  const standIn = QUALITY_STAND_IN_USD[input.quality] ?? QUALITY_STAND_IN_USD.low;
  return standIn;
}

export function roundUsd(value: number): number {
  return Math.round(value * 10_000) / 10_000;
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
