export type CoverCandidate = {
  url: string;
  kind: "cover" | "illustration" | "poster";
  /** What the file is expected to be. The component still measures it before fitting it. */
  shape: "square" | "portrait";
};

type StoryArtUrls = {
  coverUrl?: string | null;
  illustrationUrl?: string | null;
  posterUrl?: string | null;
};

/**
 * Square art first: the square cover composed from the shared illustration, then the illustration itself.
 * An older story may only have its 4:5 keepsake; it is shown whole inside the square, never stretched.
 * URLs that already failed to load are skipped. Nothing here asks for new artwork.
 */
export function coverCandidates(story: StoryArtUrls, broken: ReadonlySet<string> = new Set()): CoverCandidate[] {
  const list: CoverCandidate[] = [];
  const seen = new Set<string>();
  const add = (url: string | null | undefined, kind: CoverCandidate["kind"], shape: CoverCandidate["shape"]) => {
    const clean = url?.trim();
    if (!clean || seen.has(clean) || broken.has(clean)) return;
    seen.add(clean);
    list.push({ url: clean, kind, shape });
  };
  add(story.coverUrl, "cover", "square");
  add(story.illustrationUrl, "illustration", "square");
  add(story.posterUrl, "poster", "portrait");
  return list;
}

export function pickCover(story: StoryArtUrls, broken: ReadonlySet<string> = new Set()): CoverCandidate | null {
  return coverCandidates(story, broken)[0] ?? null;
}

/** Fill the square only when the picture really is square (within 4%). Anything else is contained. */
export function coverFit(naturalWidth: number, naturalHeight: number): "fill" | "contain" {
  if (!(naturalWidth > 0) || !(naturalHeight > 0)) return "contain";
  return Math.abs(naturalWidth / naturalHeight - 1) <= 0.04 ? "fill" : "contain";
}
