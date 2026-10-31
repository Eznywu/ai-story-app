/** Square cover and 4:5 keepsake share one square illustration. Text sits outside it. */

export const MASTER_SIZE = 1024;
export const COVER_SIZE = 1080;
export const KEEPSAKE_WIDTH = 1080;
export const KEEPSAKE_HEIGHT = 1350;

/** 1053 / 1350 = 0.78, inside the 75–80% illustration band. */
export const KEEPSAKE_ART_HEIGHT = 1053;
/** Leaves the bottom band free for a three-line title, caption, dedication, and wordmark. */
export const COVER_ART_HEIGHT = 760;

export function keepsakeArtRatio(): number {
  return KEEPSAKE_ART_HEIGHT / KEEPSAKE_HEIGHT;
}

export type WrappedText = {
  lines: string[];
  truncated: boolean;
};

function ellipsize(line: string, maxUnits: number): string {
  if (line.length <= maxUnits) return line;
  const mark = "…";
  return `${line.slice(0, Math.max(1, maxUnits - 1)).trimEnd()}${mark}`;
}

/**
 * English wraps on words. Traditional Chinese and other CJK text wrap by
 * character so a title with no spaces still breaks into the line limit.
 */
export function wrapPosterText(text: string, maxUnits: number, maxLines: number): WrappedText {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || maxLines < 1 || maxUnits < 1) return { lines: [], truncated: false };
  const cjk = /[\u3400-\u9fff]/.test(clean);
  const lines: string[] = [];
  if (cjk) {
    let rest = clean;
    while (rest && lines.length < maxLines) {
      lines.push(rest.slice(0, maxUnits));
      rest = rest.slice(maxUnits).trim();
    }
    if (rest) {
      lines[lines.length - 1] = ellipsize(lines[lines.length - 1] ?? "", maxUnits);
      return { lines, truncated: true };
    }
    return { lines, truncated: false };
  }

  const words = clean.split(" ");
  let current = "";
  let index = 0;
  while (index < words.length && lines.length < maxLines) {
    const word = words[index] ?? "";
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxUnits) {
      current = next;
      index += 1;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
      continue;
    }
    lines.push(ellipsize(word, maxUnits));
    index += 1;
    current = "";
  }
  if (current && lines.length < maxLines) lines.push(current);
  const truncated = index < words.length;
  if (truncated && lines.length) {
    lines[lines.length - 1] = ellipsize(lines[lines.length - 1] ?? "", maxUnits);
  }
  return { lines, truncated };
}

export function posterCopy(input: {
  title: string;
  caption?: string | null;
  dedication?: string | null;
  large?: boolean;
}): { title: WrappedText; caption: WrappedText; dedication: WrappedText } {
  const units = input.large ? 16 : 28;
  const captionUnits = input.large ? 18 : 36;
  return {
    title: wrapPosterText(input.title || "Happy Horse", units, 3),
    caption: wrapPosterText(input.caption ?? "", captionUnits, 2),
    dedication: wrapPosterText(input.dedication ?? "", captionUnits, 1),
  };
}
