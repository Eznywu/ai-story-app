import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";

export type PosterCreateOutcome = "illustrated" | "text_fallback";

export type ArtworkIntent = "create" | "read" | "download" | "reload" | "regenerate";

export type ArtworkRequestResult = {
  status: "pending" | "illustrated" | "fallback" | "error" | "rejected";
  outcome: PosterCreateOutcome | "none";
  error?: string;
  illustrationUrl: string | null;
  coverUrl: string | null;
  posterUrl: string | null;
  caption: string | null;
  dedication: string | null;
  cacheHit: boolean;
  providerCalls: number;
  attemptCount: number;
  estimatedCostUsd: number;
};

const CLIENT_KEY = "hh.artwork.client";

export function artworkClientKey(): string {
  try {
    const existing = localStorage.getItem(CLIENT_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(CLIENT_KEY, next);
    return next;
  } catch {
    return "missing-client";
  }
}

/** Save the keepsake PNG. This does not ask for a new illustration. */
export function downloadPosterPng(blob: Blob, titleForFilename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(titleForFilename)}-poster.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function requestStoryArtwork(params: {
  storyId: string;
  title?: string;
  caption?: string;
  dedication?: string;
  intent: ArtworkIntent;
  forceFallback?: boolean;
}): Promise<ArtworkRequestResult> {
  const response = await fetch("/api/poster", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-hh-artwork-client": artworkClientKey(),
    },
    body: JSON.stringify(params),
  });
  const data = (await response.json().catch(() => ({}))) as Partial<ArtworkRequestResult> & {
    error?: string;
  };
  if (redirectIfUnsigned(response.status)) {
    throw new Error(data.error || "Sign in to continue.");
  }
  if (!response.ok && response.status !== 202) {
    throw new Error(data.error || `Poster request failed (${response.status})`);
  }
  return {
    status: data.status ?? "error",
    outcome: data.outcome ?? "none",
    error: data.error,
    illustrationUrl: data.illustrationUrl ?? null,
    coverUrl: data.coverUrl ?? null,
    posterUrl: data.posterUrl ?? null,
    caption: data.caption ?? null,
    dedication: data.dedication ?? null,
    cacheHit: Boolean(data.cacheHit),
    providerCalls: data.providerCalls ?? 0,
    attemptCount: data.attemptCount ?? 0,
    estimatedCostUsd: data.estimatedCostUsd ?? 0,
  };
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "story"
  );
}
