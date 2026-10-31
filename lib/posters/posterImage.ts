import { createError, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { generatePosterPngFromGemini } from "@/lib/posters/geminiPoster";
import { generatePosterPngFromOpenAI } from "@/lib/posters/openaiPoster";
import { posterErrorLooksLikeContentBlocked, posterErrorLooksLikeMissingConfig } from "@/lib/posters/posterDiagnostics";
import { isRecoverablePosterProviderConnectivityFailure } from "@/lib/posters/posterProviderErrors";
import {
  mockPosterFallbackEnabled,
  mockPosterPngBuffer,
  mockProvidersEnabled,
} from "@/lib/providers/mockProviders";

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
  if (mockPosterFallbackEnabled()) {
    throw createError("OpenAI timed out or was blocked on the network.", 503);
  }
  if (mockProvidersEnabled()) {
    console.info("[poster] mock png");
    return mockPosterPngBuffer();
  }

  const rawProvider = process.env.POSTER_IMAGE_PROVIDER?.trim();
  const mode = rawProvider?.toLowerCase();
  const hasOpen = hasOpenAiKey();
  const hasGemini = hasGeminiKey();

  console.info("[poster] start", {
    mode: mode || "auto",
    primary: hasOpen ? "openai" : hasGemini ? "gemini" : "none",
    hasOpenAIKey: hasOpen,
    hasGeminiKey: hasGemini,
    genre: input.genre ?? null,
    storyChars: input.story.length,
  });

  if (mode === "gemini") {
    if (!hasGemini) {
      console.warn("[poster] event", { event: "missing_api_key", provider: "gemini" });
      throw createError(
        "POSTER_IMAGE_PROVIDER=gemini but no Gemini API key. Set GEMINI_API_KEY (or GOOGLE_API_KEY).",
        500
      );
    }
    console.info("[poster] invoke", { provider: "gemini", model: process.env.GEMINI_IMAGE_MODEL ?? "imagen-4.0-fast-generate-001" });
    try {
      const buf = await generatePosterPngFromGemini(input);
      console.info("[poster] ok", { provider: "gemini", bytes: buf.length });
      return buf;
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "");
      if (posterErrorLooksLikeContentBlocked(getErrorStatus(e, 0), msg)) {
        console.warn("[poster] event", { event: "content_block", provider: "gemini" });
      } else if (isRecoverablePosterProviderConnectivityFailure(e)) {
        console.warn("[poster] event", { event: "gemini_transport", provider: "gemini" });
      }
      throw e;
    }
  }

  if (mode === "openai") {
    console.info("[poster] invoke", { provider: "openai", forced: true });
    try {
      const buf = await generatePosterPngFromOpenAI(input);
      console.info("[poster] ok", { provider: "openai", bytes: buf.length });
      return buf;
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "");
      if (posterErrorLooksLikeContentBlocked(getErrorStatus(e, 0), msg)) {
        console.warn("[poster] event", { event: "content_block", provider: "openai" });
      } else if (isRecoverablePosterProviderConnectivityFailure(e)) {
        console.warn("[poster] event", { event: "openai_transport", provider: "openai" });
      }
      throw e;
    }
  }

  // auto
  if (hasOpen) {
    try {
      console.info("[poster] invoke", { provider: "openai", mode: "auto" });
      const buf = await generatePosterPngFromOpenAI(input);
      console.info("[poster] ok", { provider: "openai", bytes: buf.length });
      return buf;
    } catch (e: unknown) {
      if (!hasGemini || !isRecoverablePosterProviderConnectivityFailure(e)) {
        const msg = getErrorMessage(e, "");
        if (posterErrorLooksLikeContentBlocked(getErrorStatus(e, 0), msg)) {
          console.warn("[poster] event", { event: "content_block", provider: "openai", mode: "auto" });
        } else if (posterErrorLooksLikeMissingConfig(msg)) {
          console.warn("[poster] event", { event: "missing_config", provider: "openai" });
        }
        throw e;
      }
      console.warn("[poster] event", {
        event: "openai_transport_fallback_gemini",
        detail: getErrorMessage(e, "").slice(0, 120),
      });
      try {
        const buf = await generatePosterPngFromGemini(input);
        console.info("[poster] ok", { provider: "gemini", via: "fallback_after_openai", bytes: buf.length });
        return buf;
      } catch (e2: unknown) {
        console.error("[poster] event", { event: "both_providers_failed", mode: "auto" });
        const o = getErrorMessage(e, "OpenAI failed");
        const g = getErrorMessage(e2, "Gemini failed");
        throw createError(
          `Poster image failed after OpenAI and Gemini. OpenAI: ${o} · Gemini: ${g}`,
          502
        );
      }
    }
  }
  if (hasGemini) {
    console.info("[poster] invoke", { provider: "gemini", mode: "auto" });
    try {
      const buf = await generatePosterPngFromGemini(input);
      console.info("[poster] ok", { provider: "gemini", bytes: buf.length });
      return buf;
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "");
      if (posterErrorLooksLikeContentBlocked(getErrorStatus(e, 0), msg)) {
        console.warn("[poster] event", { event: "content_block", provider: "gemini", mode: "auto" });
      } else if (isRecoverablePosterProviderConnectivityFailure(e)) {
        console.warn("[poster] event", { event: "gemini_transport", provider: "gemini", mode: "auto" });
      }
      throw e;
    }
  }

  console.warn("[poster] event", { event: "missing_api_key", provider: "any" });
  throw createError(
    "Add OPENAI_API_KEY for illustrated posters (recommended), or set GEMINI_API_KEY and optionally POSTER_IMAGE_PROVIDER=gemini.",
    500
  );
}
