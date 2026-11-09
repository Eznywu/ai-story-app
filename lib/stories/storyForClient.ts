import type { Story } from "@/generated/prisma/client";
import { posterListing } from "@/lib/stories/posterLibrary";

/** Private storage locations, the owner id, and artwork bookkeeping (cost estimates, cache keys) stay on the server. */
const SERVER_ONLY = ["userId", "audioStorageUrl", "artworkMeta", "artworkCacheKey"] as const;
/** The reader loads these when a story is opened; library rows do not need them. */
const READER_ONLY = ["characterSnapshot", "visualBrief"] as const;

function without<T extends object, K extends keyof T>(row: T, keys: readonly K[]): Omit<T, K> {
  const copy = { ...row };
  for (const key of keys) delete copy[key];
  return copy;
}

function posterRoute(filename: string | null | undefined) {
  return filename ? `/api/posters/${encodeURIComponent(filename)}` : null;
}

/** The story shape the browser receives. */
export function storyForClient(row: Story) {
  const posterUrl = row.posterUrl?.trim() || posterRoute(row.posterFilename);
  const listing = posterListing({ posterUrl, artworkMeta: row.artworkMeta });
  return {
    ...without(row, SERVER_ONLY),
    createdAt: row.createdAt.toISOString(),
    illustrationUrl: row.illustrationUrl?.trim() || posterRoute(row.illustrationFilename),
    coverUrl: row.coverUrl?.trim() || posterRoute(row.coverFilename),
    posterUrl,
    audioUrl:
      row.audioUrl?.trim() || (row.audioFilename ? `/api/audio/${encodeURIComponent(row.audioFilename)}` : null),
    posterSaved: listing.inLibrary,
    posterSavedAt: listing.savedAt,
  };
}

export function storySummaryForClient(row: Story) {
  return without(storyForClient(row), READER_ONLY);
}
