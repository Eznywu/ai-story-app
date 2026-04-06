import OpenAI from "openai";
import { createError, getErrorStatus } from "@/lib/errors";
import { buildPosterImagePrompt } from "@/lib/posterPromptConfig";

const IMAGE_MODEL = process.env.OPENAI_POSTER_IMAGE_MODEL ?? "dall-e-3";

const POSTER_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.OPENAI_POSTER_TIMEOUT_MS) || 180_000, 45_000),
  600_000
);

function normalizeOpenAiConnectivityError(err: unknown): never {
  const status = getErrorStatus(err, 0);
  if (status > 0) throw err;

  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg === "fetch failed" ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|Connect\s*Timeout|connect\s*timeout|UND_ERR_/i.test(
      msg
    ) ||
    /socket\s*(hang\s*up|closed)|network(\s*error)?/i.test(msg)
  ) {
    throw createError(
      "OpenAI timed out or was blocked on the network. Allow HTTPS to api.openai.com, or adjust OPENAI_POSTER_TIMEOUT_MS in .env.",
      503
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}

/**
 * OpenAI: configured poster prompt + DALL·E image. Uses OPENAI_API_KEY.
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
    timeout: POSTER_TIMEOUT_MS,
    maxRetries: 0,
  });

  try {
    const prompt = buildPosterImagePrompt({
      title: input.title,
      genre: input.genre,
      story: input.story,
    });
    const quality =
      process.env.OPENAI_POSTER_IMAGE_QUALITY === "hd"
        ? ("hd" as const)
        : ("standard" as const);

    const image = await client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: "1024x1792",
      quality,
      response_format: "b64_json",
    });

    const b64 = image.data?.[0]?.b64_json;
    if (b64) {
      return Buffer.from(b64, "base64");
    }

    throw createError("Image generation returned no image data. Try a shorter story or different genre.", 502);
  } catch (err) {
    const status = getErrorStatus(err, 0);
    if (status > 0) throw err;
    normalizeOpenAiConnectivityError(err);
  }
}
