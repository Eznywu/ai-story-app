import "dotenv/config";

function req(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export function loadOpenAiKey(): string {
  return req("OPENAI_API_KEY");
}

export function loadGeminiKey(): string {
  return req("GEMINI_API_KEY");
}

export const creativeModel = process.env.OPENAI_CREATIVE_MODEL ?? "gpt-4o";

export const openaiPosterModel = process.env.OPENAI_POSTER_MODEL ?? "gpt-image-1.5";

const posterSizeRaw = process.env.OPENAI_POSTER_SIZE?.trim();
export const openaiPosterSize: "1024x1024" | "1024x1536" | "1536x1024" | "auto" =
  posterSizeRaw === "1024x1024" ||
  posterSizeRaw === "1024x1536" ||
  posterSizeRaw === "1536x1024" ||
  posterSizeRaw === "auto"
    ? posterSizeRaw
    : "1024x1536";

const posterQualityRaw = process.env.OPENAI_POSTER_QUALITY?.trim();
export const openaiPosterQuality: "low" | "medium" | "high" | "auto" =
  posterQualityRaw === "low" ||
  posterQualityRaw === "medium" ||
  posterQualityRaw === "high" ||
  posterQualityRaw === "auto"
    ? posterQualityRaw
    : "high";

export const geminiNativeModel = process.env.GEMINI_NATIVE_IMAGE_MODEL ?? "gemini-2.5-flash-image";
export const geminiNativeAspectRatio = process.env.GEMINI_NATIVE_IMAGE_ASPECT_RATIO ?? "3:4";
export const geminiNativeImageSize = process.env.GEMINI_NATIVE_IMAGE_SIZE ?? "2K";

/** `native` = gemini-*-image generateContent; `imagen` = models.generateImages */
export const geminiPosterBackend = (process.env.GEMINI_POSTER_BACKEND ?? "native").toLowerCase();

export const geminiImagenModel = process.env.GEMINI_IMAGEN_MODEL ?? "imagen-4.0-generate-001";

/** If set, passed to Imagen `generateImages` only (native Gemini uses GEMINI_NATIVE_IMAGE_SIZE). */
export const geminiImagenImageSize = process.env.GEMINI_IMAGEN_IMAGE_SIZE?.trim();
