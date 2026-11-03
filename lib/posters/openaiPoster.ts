import OpenAI from "openai";
import { createError, getErrorStatus } from "@/lib/errors";
import { getOpenAiBaseUrl, getPosterHttpDispatcher } from "@/lib/providerHttp";
import { posterProviderTransportFailureMessage } from "@/lib/posters/posterProviderErrors";
import { providerTimeoutMs } from "@/lib/vercelDuration";

/**
 * Everyday square covers use GPT Image 2.5 Flare.
 * `gpt-image-1.5` and `gpt-image-1-mini` shut down on 1 Dec 2026.
 * A different model is used only when OPENAI_POSTER_IMAGE_MODEL is set.
 * There is no automatic second model call.
 */
const DEFAULT_IMAGE_MODEL = "gpt-image-2.5-flare";
const IMAGE_MODEL = process.env.OPENAI_POSTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
const IMAGE_SIZE = "1024x1024";

const POSTER_TIMEOUT_MS = providerTimeoutMs(
  Number(process.env.OPENAI_POSTER_TIMEOUT_MS),
  180_000,
  45_000
);

function openAiErrorLooksLikeTransportFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg === "fetch failed" ||
    posterProviderTransportFailureMessage(msg) ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|Connect\s*Timeout|connect\s*timeout|UND_ERR_/i.test(
      msg
    ) ||
    /socket\s*(hang\s*up|closed)|network(\s*error)?/i.test(msg)
  );
}

/** Map transport failures to 503 (including SDK errors that carry HTTP 502 + "Connection error."). */
function rethrowOpenAiConnectivityAs503OrThrow(err: unknown): never {
  if (openAiErrorLooksLikeTransportFailure(err)) {
    throw createError(
      "OpenAI timed out or was blocked on the network. Allow HTTPS to api.openai.com, or adjust OPENAI_POSTER_TIMEOUT_MS in .env.",
      503
    );
  }
  throw err instanceof Error ? err : new Error(String(err));
}

function isGptImageModel(model: string) {
  return model.startsWith("gpt-image");
}

function gptImageQuality(): "low" | "medium" | "high" | "auto" {
  const raw = process.env.OPENAI_POSTER_IMAGE_QUALITY?.trim().toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high" || raw === "auto") return raw;
  if (raw === "hd") return "high";
  return "low";
}

async function generateOnce(
  client: OpenAI,
  model: string,
  prompt: string
): Promise<{ bytes: Buffer; usage: { inputTokens?: number; outputTokens?: number } | null }> {
  const image = isGptImageModel(model)
    ? await client.images.generate({
        model,
        prompt,
        n: 1,
        size: IMAGE_SIZE,
        quality: gptImageQuality(),
        output_format: "png",
      })
    : await client.images.generate({
        model,
        prompt: prompt.slice(0, 3900),
        n: 1,
        size: IMAGE_SIZE,
        quality: "standard",
        response_format: "b64_json",
      });

  const b64 = image.data?.[0]?.b64_json;
  if (!b64) {
    throw createError("Image generation returned no image data.", 502);
  }
  const usage = (image as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
  return {
    bytes: Buffer.from(b64, "base64"),
    usage: usage
      ? { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens }
      : null,
  };
}

/** One OpenAI image request. Timeouts are not retried here. */
export async function generatePosterPngFromOpenAI(input: {
  prompt: string;
}): Promise<{
  bytes: Buffer;
  model: string;
  quality: string;
  size: string;
  usage: { inputTokens?: number; outputTokens?: number } | null;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw createError("Missing OPENAI_API_KEY for OpenAI poster generation.", 500);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: getOpenAiBaseUrl(),
    timeout: POSTER_TIMEOUT_MS,
    maxRetries: 0,
    fetchOptions: { dispatcher: getPosterHttpDispatcher(POSTER_TIMEOUT_MS) },
  });

  try {
    console.info("[poster] openai model", {
      model: IMAGE_MODEL,
      size: IMAGE_SIZE,
      quality: gptImageQuality(),
      timeoutMs: POSTER_TIMEOUT_MS,
    });
    const image = await generateOnce(client, IMAGE_MODEL, input.prompt);
    return {
      bytes: image.bytes,
      model: IMAGE_MODEL,
      quality: gptImageQuality(),
      size: IMAGE_SIZE,
      usage: image.usage,
    };
  } catch (err) {
    const status = getErrorStatus(err, 0);
    if (status > 0 && !openAiErrorLooksLikeTransportFailure(err)) {
      throw err;
    }
    rethrowOpenAiConnectivityAs503OrThrow(err);
  }
}
