import { createError } from "@/lib/errors";
import { generatePosterPngFromGemini } from "@/lib/geminiPoster";
import { generatePosterPngFromOpenAI } from "@/lib/openaiPoster";

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function hasGeminiKey(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  );
}

/**
 * Illustrated poster raster. Provider selection:
 * - `POSTER_IMAGE_PROVIDER=openai` — GPT scene + DALL·E (needs OPENAI_API_KEY)
 * - `POSTER_IMAGE_PROVIDER=gemini` — Gemini image API (needs Gemini key). Set `GEMINI_IMAGE_MODEL` to an Imagen id (`imagen-…`, `:predict`) or a native image model such as `gemini-2.5-flash-image` (“Nano Banana”, `:generateContent`).
 * - omit / `auto` — prefer OpenAI when OPENAI_API_KEY is set, else Gemini
 */
export async function generatePosterPngBuffer(input: {
  title: string;
  story: string;
  genre?: string;
}): Promise<Buffer> {
  const rawProvider = process.env.POSTER_IMAGE_PROVIDER?.trim();
  const mode = rawProvider?.toLowerCase();
  const hasOpen = hasOpenAiKey();
  const hasGemini = hasGeminiKey();

  console.info("[poster]", {
    POSTER_IMAGE_PROVIDER: rawProvider || "auto",
    hasOpenAIKey: hasOpen,
    hasGeminiKey: hasGemini,
    genre: input.genre ?? null,
    storyChars: input.story.length,
  });

  if (mode === "gemini") {
    if (!hasGemini) {
      console.error("[poster] POSTER_IMAGE_PROVIDER=gemini but no Gemini/Google AI key in env");
      throw createError(
        "POSTER_IMAGE_PROVIDER=gemini but no Gemini API key. Set GEMINI_API_KEY (or GOOGLE_API_KEY).",
        500
      );
    }
    console.info("[poster] invoking Gemini image", {
      GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL ?? "imagen-4.0-fast-generate-001",
    });
    const buf = await generatePosterPngFromGemini(input);
    console.info("[poster] Gemini image ok", { bytes: buf.length });
    return buf;
  }

  if (mode === "openai") {
    console.info("[poster] invoking OpenAI (forced)");
    const buf = await generatePosterPngFromOpenAI(input);
    console.info("[poster] OpenAI ok", { bytes: buf.length });
    return buf;
  }

  // auto
  if (hasOpen) {
    console.info("[poster] auto → OpenAI");
    const buf = await generatePosterPngFromOpenAI(input);
    console.info("[poster] OpenAI ok", { bytes: buf.length });
    return buf;
  }
  if (hasGemini) {
    console.info("[poster] auto → Gemini image");
    const buf = await generatePosterPngFromGemini(input);
    console.info("[poster] Gemini image ok", { bytes: buf.length });
    return buf;
  }

  console.error("[poster] no provider: set OPENAI_API_KEY or GEMINI_API_KEY (or GOOGLE_* variants)");
  throw createError(
    "Add OPENAI_API_KEY for illustrated posters (recommended), or set GEMINI_API_KEY and optionally POSTER_IMAGE_PROVIDER=gemini.",
    500
  );
}
