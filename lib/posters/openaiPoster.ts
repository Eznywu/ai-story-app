import OpenAI from "openai";
import { createError, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { getOpenAiBaseUrl, getPosterHttpDispatcher } from "@/lib/providerHttp";
import { posterProviderTransportFailureMessage } from "@/lib/posters/posterProviderErrors";
import { buildPosterImagePrompt } from "@/lib/posters/posterPromptConfig";
import { providerTimeoutMs } from "@/lib/vercelDuration";

/** GPT image models replaced DALL·E for new accounts. `dall-e-3` still works when set explicitly. */
const DEFAULT_IMAGE_MODEL = "gpt-image-1.5";
const IMAGE_MODEL = process.env.OPENAI_POSTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;

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
  return "medium";
}

function modelLooksUnavailable(err: unknown): boolean {
  const status = getErrorStatus(err, 0);
  const msg = getErrorMessage(err, "").toLowerCase();
  return (
    status === 404 ||
    /model.*(not found|does not exist|unavailable|deprecated|retired)/.test(msg) ||
    /invalid.*model|unknown model/.test(msg)
  );
}

async function generateOnce(client: OpenAI, model: string, prompt: string): Promise<Buffer> {
  const image = isGptImageModel(model)
    ? await client.images.generate({
        model,
        prompt,
        n: 1,
        size: "1024x1536",
        quality: gptImageQuality(),
        output_format: "png",
      })
    : await client.images.generate({
        model,
        prompt: prompt.slice(0, 3900),
        n: 1,
        size: "1024x1792",
        quality: process.env.OPENAI_POSTER_IMAGE_QUALITY === "hd" ? "hd" : "standard",
        response_format: "b64_json",
      });

  const b64 = image.data?.[0]?.b64_json;
  if (!b64) {
    throw createError("Image generation returned no image data. Try a shorter story or different genre.", 502);
  }
  return Buffer.from(b64, "base64");
}

/**
 * OpenAI illustrated poster. Default model is `gpt-image-1.5` (portrait 1024x1536).
 * `dall-e-3` is used only when OPENAI_POSTER_IMAGE_MODEL names it, and a missing
 * DALL·E model retries once on `gpt-image-1.5`.
 */
export async function generatePosterPngFromOpenAI(input: {
  title: string;
  story: string;
  genre?: string;
}): Promise<Buffer> {
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

  const prompt = buildPosterImagePrompt({
    title: input.title,
    genre: input.genre,
    story: input.story,
  });

  try {
    console.info("[poster] openai model", { model: IMAGE_MODEL, timeoutMs: POSTER_TIMEOUT_MS });
    return await generateOnce(client, IMAGE_MODEL, prompt);
  } catch (err) {
    if (!isGptImageModel(IMAGE_MODEL) && modelLooksUnavailable(err)) {
      console.warn("[poster] image model unavailable, retrying", {
        from: IMAGE_MODEL,
        to: DEFAULT_IMAGE_MODEL,
      });
      try {
        return await generateOnce(client, DEFAULT_IMAGE_MODEL, prompt);
      } catch (retryErr) {
        const status = getErrorStatus(retryErr, 0);
        if (status > 0 && !openAiErrorLooksLikeTransportFailure(retryErr)) throw retryErr;
        rethrowOpenAiConnectivityAs503OrThrow(retryErr);
      }
    }
    const status = getErrorStatus(err, 0);
    if (status > 0 && !openAiErrorLooksLikeTransportFailure(err)) {
      throw err;
    }
    rethrowOpenAiConnectivityAs503OrThrow(err);
  }
}
