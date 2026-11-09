/**
 * Keepsakes are not a separate table. A keepsake is the story's poster file
 * (`posterUrl`). Older rows with a poster and no library flag stay in Posters.
 * A poster made after this flag exists stays out until Save Poster writes one
 * record on the story. Saving the same story and poster again does not add another.
 */

export const POSTER_LIBRARY_PENDING = "pending";
export const POSTER_LIBRARY_SAVED = "saved";

export type PosterListing = {
  inLibrary: boolean;
  savedAt: string | null;
  legacy: boolean;
};

function metaOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

export function posterSaveKey(storyId: string, posterUrl: string): string {
  return `${storyId}\n${posterUrl.trim()}`;
}

export function posterListing(input: { posterUrl?: string | null; artworkMeta?: unknown }): PosterListing {
  const url = (input.posterUrl ?? "").trim();
  if (!url) return { inLibrary: false, savedAt: null, legacy: false };
  const meta = metaOf(input.artworkMeta);
  const savedAt = typeof meta.posterSavedAt === "string" ? meta.posterSavedAt : "";
  const savedUrl = typeof meta.savedPosterUrl === "string" ? meta.savedPosterUrl : "";
  if (savedAt && savedUrl === url) return { inLibrary: true, savedAt, legacy: false };
  if (meta.posterLibrary === POSTER_LIBRARY_PENDING) return { inLibrary: false, savedAt: null, legacy: false };
  return { inLibrary: true, savedAt: null, legacy: true };
}

/** A newly written poster file is not in the library until the parent saves it. */
export function artworkMetaAfterIllustration(
  previous: unknown,
  incoming: Record<string, unknown>,
  posterReplaced: boolean
): Record<string, unknown> {
  const prev = metaOf(previous);
  if (!posterReplaced) {
    return {
      ...prev,
      ...incoming,
      posterLibrary: prev.posterLibrary,
      posterSavedAt: prev.posterSavedAt,
      savedPosterUrl: prev.savedPosterUrl,
      posterSaveKey: prev.posterSaveKey,
    };
  }
  const next = { ...prev, ...incoming };
  delete next.posterSavedAt;
  delete next.savedPosterUrl;
  delete next.posterSaveKey;
  next.posterLibrary = POSTER_LIBRARY_PENDING;
  return next;
}

export function markPosterSaved(
  previous: unknown,
  input: { storyId: string; posterUrl: string; savedAt: string }
): { meta: Record<string, unknown>; alreadySaved: boolean; savedAt: string } {
  const url = input.posterUrl.trim();
  const current = posterListing({ posterUrl: url, artworkMeta: previous });
  if (current.inLibrary && current.savedAt) {
    return { meta: metaOf(previous), alreadySaved: true, savedAt: current.savedAt };
  }
  const savedAt = input.savedAt;
  return {
    meta: {
      ...metaOf(previous),
      posterLibrary: POSTER_LIBRARY_SAVED,
      posterSavedAt: savedAt,
      savedPosterUrl: url,
      posterSaveKey: posterSaveKey(input.storyId, url),
    },
    alreadySaved: false,
    savedAt,
  };
}
