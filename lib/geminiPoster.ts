import { Agent, fetch } from "undici";
import { createError, getErrorStatus } from "@/lib/errors";
import { buildPosterImagePrompt } from "@/lib/posterPromptConfig";

/**
 * Imagen raster models use `:predict`. Natively multimodal image models (marketed as
 * “Nano Banana”) use `:generateContent` — e.g. `gemini-2.5-flash-image`,
 * `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`.
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "imagen-4.0-fast-generate-001";

function posterUsesImagenPredict(modelId: string): boolean {
  return modelId.toLowerCase().startsWith("imagen");
}

/**
 * Node's built-in `fetch` uses Undici with a ~10s TCP connect timeout, which breaks
 * on slow paths to Google. We call the REST API with an explicit Agent so connect,
 * headers, and body phases share one longer limit.
 */
const HTTP_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.GEMINI_HTTP_TIMEOUT_MS) || 300_000, 30_000),
  600_000
);

const geminiDispatcher = new Agent({
  connectTimeout: HTTP_TIMEOUT_MS,
  headersTimeout: HTTP_TIMEOUT_MS,
  bodyTimeout: HTTP_TIMEOUT_MS,
});

function geminiOrigin(): string {
  return (process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com").replace(
    /\/$/,
    ""
  );
}

function geminiApiKey(): string | undefined {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return key || undefined;
}

function requireApiKey(): string {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw createError(
      "Missing Gemini API key. Set GEMINI_API_KEY in .env (see https://aistudio.google.com/apikey ).",
      500
    );
  }
  return apiKey;
}

async function geminiPostJson(path: string, body: unknown): Promise<unknown> {
  const apiKey = requireApiKey();
  const url = `${geminiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    dispatcher: geminiDispatcher,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw createError(`Google AI HTTP ${res.status}: ${text.slice(0, 600)}`, 502);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw createError("Google AI returned invalid JSON.", 502);
  }
}

function getConnectErrorCode(err: unknown): string {
  if (!(err instanceof Error) || !("cause" in err) || err.cause == null) return "";
  const c = err.cause;
  if (typeof c !== "object" || !("code" in c)) return "";
  return String((c as { code: unknown }).code);
}

function normalizeGoogleAiError(err: unknown): never {
  const status = getErrorStatus(err, 0);
  if (status > 0) throw err;

  const msg = err instanceof Error ? err.message : String(err);
  const code = getConnectErrorCode(err);

  if (
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_HEADERS_TIMEOUT" ||
    code === "UND_ERR_BODY_TIMEOUT" ||
    msg === "fetch failed" ||
    /Connect Timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED/i.test(msg)
  ) {
    throw createError(
      "Google AI timed out or was blocked on the network. Allow HTTPS to generativelanguage.googleapis.com, try VPN, or increase GEMINI_HTTP_TIMEOUT_MS in .env (default 300000 ms).",
      503
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}

/** Imagen REST sometimes nests image bytes; walk shallow objects/arrays. */
function findBytesBase64Encoded(obj: unknown, depth = 0): string | undefined {
  if (depth > 8 || obj == null) return undefined;
  if (typeof obj === "string") return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const v = findBytesBase64Encoded(item, depth + 1);
      if (v) return v;
    }
    return undefined;
  }
  if (typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  const b = o.bytesBase64Encoded;
  if (typeof b === "string" && b.length > 64) return b;
  for (const key of Object.keys(o)) {
    const v = findBytesBase64Encoded(o[key], depth + 1);
    if (v) return v;
  }
  return undefined;
}

type GeminiContentPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

function extractNativeGeminiImageBase64(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const cands = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(cands) || !cands[0] || typeof cands[0] !== "object") return undefined;
  const content = (cands[0] as { content?: { parts?: unknown } }).content;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return undefined;
  for (const p of parts) {
    if (!p || typeof p !== "object") continue;
    const part = p as GeminiContentPart;
    const camel = part.inlineData?.data;
    if (typeof camel === "string" && camel.length > 64) return camel;
    const snake = part.inline_data?.data;
    if (typeof snake === "string" && snake.length > 64) return snake;
  }
  return undefined;
}

function nativeImageGenerationBody(prompt: string): Record<string, unknown> {
  const aspectRatio =
    process.env.GEMINI_NATIVE_IMAGE_ASPECT_RATIO?.trim() || "3:4";
  const imageSize = process.env.GEMINI_NATIVE_IMAGE_SIZE?.trim();
  const imageConfig: Record<string, string> = { aspectRatio };
  if (imageSize) imageConfig.imageSize = imageSize;

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig,
    },
  };
}

async function generatePosterViaNativeGeminiImage(modelId: string, prompt: string): Promise<Buffer> {
  const data = await geminiPostJson(
    `/v1beta/models/${encodeURIComponent(modelId)}:generateContent`,
    nativeImageGenerationBody(prompt)
  );

  const promptFeedback = (data as { promptFeedback?: { blockReason?: string } }).promptFeedback;
  const blockReason = promptFeedback?.blockReason;
  if (typeof blockReason === "string" && blockReason.length > 0) {
    throw createError(`Poster prompt was blocked: ${blockReason}`, 422);
  }

  const b64 = extractNativeGeminiImageBase64(data);
  if (b64) {
    return Buffer.from(b64, "base64");
  }

  const finishReason = (data as { candidates?: { finishReason?: string }[] }).candidates?.[0]
    ?.finishReason;
  const hint =
    typeof finishReason === "string"
      ? ` (finishReason: ${finishReason})`
      : "";
  throw createError(
    `Native image model returned no image bytes.${hint} Try GEMINI_IMAGE_MODEL=imagen-4.0-fast-generate-001 or another gemini-*-image* model.`,
    502
  );
}

/**
 * Gemini image: Imagen (`:predict`) or native Nano Banana family (`:generateContent`).
 */
export async function generatePosterPngFromGemini(input: {
  title: string;
  story: string;
  genre?: string;
}): Promise<Buffer> {
  const modelId = IMAGE_MODEL.trim();
  try {
    const prompt = buildPosterImagePrompt({
      title: input.title,
      genre: input.genre,
      story: input.story,
    });

    if (!posterUsesImagenPredict(modelId)) {
      return await generatePosterViaNativeGeminiImage(modelId, prompt);
    }

    const data = await geminiPostJson(
      `/v1beta/models/${encodeURIComponent(modelId)}:predict`,
      {
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "3:4",
          personGeneration: "DONT_ALLOW",
        },
      }
    );

    const predictions = (data as { predictions?: unknown }).predictions;
    if (!Array.isArray(predictions) || predictions.length === 0) {
      throw createError("Image generation returned no predictions.", 502);
    }

    const first = predictions[0] as Record<string, unknown>;
    const rai = first?.raiFilteredReason;
    if (typeof rai === "string" && rai.length > 0) {
      throw createError(`Poster image was blocked: ${rai}`, 422);
    }

    const b64 = findBytesBase64Encoded(predictions[0]);
    if (b64) {
      return Buffer.from(b64, "base64");
    }

    throw createError("Image generation returned no image bytes. Try a shorter story or different genre.", 502);
  } catch (err) {
    normalizeGoogleAiError(err);
  }
}
