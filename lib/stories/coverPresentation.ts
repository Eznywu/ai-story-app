import type { PosterCreateOutcome } from "@/lib/posters/poster";

export type CoverPosterState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "ready"; url: string; outcome: PosterCreateOutcome; hint?: string }
  | { status: "error"; message: string };

export type CoverPresentation = {
  showImage: boolean;
  imageUrl: string | null;
  showFallbackArt: boolean;
  message: string | null;
  showRetry: boolean;
};

export const COVER_LOAD_FAILED = "This cover couldn't be loaded.";
const SIMPLE_COVER = "Simple cover — illustrated artwork was unavailable.";

/** True when two poster URLs point at the same path, including a relative URL and its absolute form. */
export function sameMediaUrl(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    const base = "http://cover.local";
    return new URL(a, base).href === new URL(b, base).href;
  } catch {
    return false;
  }
}

export function coverImageUnreadable(poster: CoverPosterState, brokenUrl: string | null): boolean {
  if (poster.status !== "ready" || !brokenUrl) return false;
  return sameMediaUrl(brokenUrl, poster.url);
}

/**
 * What the listening screen should paint for the cover.
 * A saved URL that fails in the browser is not "ready artwork": show the fallback and a retry.
 */
export function coverPresentation(poster: CoverPosterState, brokenUrl: string | null): CoverPresentation {
  if (coverImageUnreadable(poster, brokenUrl)) {
    return {
      showImage: false,
      imageUrl: null,
      showFallbackArt: true,
      message: COVER_LOAD_FAILED,
      showRetry: true,
    };
  }
  if (poster.status === "error") {
    return {
      showImage: false,
      imageUrl: null,
      showFallbackArt: true,
      message: poster.message,
      showRetry: true,
    };
  }
  if (poster.status === "ready" && poster.outcome === "text_fallback") {
    return {
      showImage: true,
      imageUrl: poster.url,
      showFallbackArt: false,
      message: SIMPLE_COVER,
      showRetry: true,
    };
  }
  if (poster.status === "ready") {
    return {
      showImage: true,
      imageUrl: poster.url,
      showFallbackArt: false,
      message: null,
      showRetry: false,
    };
  }
  return {
    showImage: false,
    imageUrl: null,
    showFallbackArt: true,
    message: null,
    showRetry: false,
  };
}
