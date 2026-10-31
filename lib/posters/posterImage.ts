import fs from "node:fs";
import path from "node:path";
import { createError, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { generatePosterPngFromGemini } from "@/lib/posters/geminiPoster";
import { generatePosterPngFromOpenAI } from "@/lib/posters/openaiPoster";
import { posterErrorLooksLikeContentBlocked, posterErrorLooksLikeMissingConfig } from "@/lib/posters/posterDiagnostics";
import { isRecoverablePosterProviderConnectivityFailure } from "@/lib/posters/posterProviderErrors";
import {
  PRODUCTION_IMAGE_MODEL,
  PRODUCTION_IMAGE_QUALITY,
  PRODUCTION_IMAGE_SIZE,
  selectedImageProvider,
} from "@/lib/posters/artworkPricing";
import type { ImageProviderResult } from "@/lib/posters/artworkService";
import { sceneKindFromPrompt, type SceneKind } from "@/lib/posters/fixtureScenes";
import {
  mockPosterFallbackEnabled,
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

/** Committed square scene. No provider is called. */
export function mockIllustrationPng(kind: SceneKind = "human"): Buffer {
  const file = path.join(process.cwd(), "lib/providers/fixtures", `mock-scene-${kind}.png`);
  return fs.readFileSync(file);
}

/**
 * One illustration from the selected provider.
 * Production does not fall through to a second provider.
 */
export async function generateOneIllustration(prompt: string): Promise<ImageProviderResult> {
  if (mockPosterFallbackEnabled()) {
    throw createError("OpenAI timed out or was blocked on the network.", 503);
  }
  if (mockProvidersEnabled()) {
    console.info("[poster] mock png");
    return {
      bytes: mockIllustrationPng(sceneKindFromPrompt(prompt)),
      claimedMime: "image/png",
      model: "mock",
      quality: PRODUCTION_IMAGE_QUALITY,
      provider: "mock",
      size: PRODUCTION_IMAGE_SIZE,
      usage: null,
    };
  }

  const provider = selectedImageProvider();
  console.info("[poster] one provider", { provider, model: provider === "openai" ? PRODUCTION_IMAGE_MODEL : process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-lite-image" });

  if (provider === "gemini") {
    if (!hasGeminiKey()) {
      throw createError("POSTER_IMAGE_PROVIDER=gemini but no Gemini API key is set.", 500);
    }
    try {
      const image = await generatePosterPngFromGemini({ prompt });
      return {
        bytes: image.bytes,
        claimedMime: "image/png",
        model: image.model,
        quality: "1K",
        provider: "gemini",
        size: image.size,
        usage: null,
      };
    } catch (error: unknown) {
      logProviderFailure("gemini", error);
      throw error;
    }
  }

  if (!hasOpenAiKey()) {
    throw createError("Illustrated artwork needs OPENAI_API_KEY for the selected image provider.", 500);
  }
  try {
    const image = await generatePosterPngFromOpenAI({ prompt });
    return {
      bytes: image.bytes,
      claimedMime: "image/png",
      model: image.model,
      quality: image.quality,
      provider: "openai",
      size: image.size,
      usage: image.usage,
    };
  } catch (error: unknown) {
    logProviderFailure("openai", error);
    throw error;
  }
}

function logProviderFailure(provider: string, error: unknown) {
  const message = getErrorMessage(error, "");
  if (posterErrorLooksLikeContentBlocked(getErrorStatus(error, 0), message)) {
    console.warn("[poster] event", { event: "content_block", provider });
  } else if (posterErrorLooksLikeMissingConfig(message)) {
    console.warn("[poster] event", { event: "missing_config", provider });
  } else if (isRecoverablePosterProviderConnectivityFailure(error)) {
    console.warn("[poster] event", { event: "provider_transport", provider });
  }
}
