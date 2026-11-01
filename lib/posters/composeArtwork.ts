import sharp from "sharp";
import { BRAND_IDENTITY, BRAND_NAME } from "@/lib/brand";
import type { ImageMime } from "@/lib/posters/imageBytes";
import { happyHorseMarkSvg } from "@/lib/posters/happyHorseMark";
import type { AgeBand } from "@/lib/posters/audienceAge";
import {
  charsForWidth,
  COVER_SIZE,
  KEEPSAKE_ART_HEIGHT,
  KEEPSAKE_HEIGHT,
  KEEPSAKE_WIDTH,
  POSTER_TEXT_MARGIN,
  posterCopy,
  wrapPosterText,
} from "@/lib/posters/posterLayout";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textBlock(
  lines: string[],
  x: number,
  y: number,
  size: number,
  fill: string,
  weight: number,
  step = Math.round(size * 1.22)
): { svg: string; nextY: number } {
  const svg = lines
    .map((line, index) => {
      const baseline = y + index * step;
      return `<text x="${x}" y="${baseline}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="PingFang TC, Noto Sans CJK TC, Noto Sans TC, sans-serif">${escapeXml(line)}</text>`;
    })
    .join("");
  return { svg, nextY: y + Math.max(lines.length, 0) * step };
}

/** Hero title on the 1080-wide keepsake. 74px is 27px when the poster is shown at 390 wide. */
export const KEEPSAKE_TITLE_PX = 74;
/** Child line. 58px is 21px at the same 390-wide display. */
export const KEEPSAKE_CHILD_PX = 58;
const KEEPSAKE_CAPTION_PX = 24;
const KEEPSAKE_MARK_PX = 52;
const KEEPSAKE_WORDMARK_PX = 30;
const PHONE_DISPLAY_WIDTH = 390;

/** Canvas pixels converted to CSS pixels when the keepsake is shown at phone width. */
export function keepsakePhonePx(canvasPx: number): number {
  return (canvasPx * PHONE_DISPLAY_WIDTH) / KEEPSAKE_WIDTH;
}

function ascent(size: number): number {
  return Math.round(size * 0.8);
}

function descent(size: number): number {
  return Math.round(size * 0.22);
}

function fitLineFont(text: string, width: number, preferred: number, min: number): number {
  const sample = text.trim() || "Mia";
  let size = preferred;
  while (size > min && sample.length > charsForWidth(sample, width, size)) size -= 2;
  return size;
}

export type KeepsakeTextLayout = {
  margin: number;
  titlePx: number;
  childPx: number;
  captionPx: number;
  titleLines: string[];
  childLines: string[];
  captionLines: string[];
  titleBaseline: number;
  titleStep: number;
  childBaseline: number;
  captionBaseline: number;
  markY: number;
  markSize: number;
  wordmarkPx: number;
  gap: number;
};

/**
 * Spread the title, child line, optional caption, and logo through the cream band
 * so the title is the largest line and the band is not empty under a short stack.
 */
export function keepsakeTextLayout(input: {
  title: string;
  childLine: string;
  caption: string;
}): KeepsakeTextLayout {
  const margin = POSTER_TEXT_MARGIN;
  const textWidth = KEEPSAKE_WIDTH - margin * 2;
  const bandTop = KEEPSAKE_ART_HEIGHT;
  const bandHeight = KEEPSAKE_HEIGHT - bandTop;
  let titlePx = KEEPSAKE_TITLE_PX;
  const titleUnits = (px: number) => {
    const sample = input.title || "Happy Horse";
    const cjk = /[\u3400-\u9fff]/.test(sample);
    const advance = cjk ? px : px * 0.52;
    return Math.max(8, Math.floor(textWidth / advance));
  };
  const captionCopy = () =>
    posterCopy({
      title: input.title,
      caption: input.caption,
      textWidth,
      titlePx,
      captionPx: KEEPSAKE_CAPTION_PX,
    });
  let copy = captionCopy();
  let titleLines = wrapPosterText(input.title, titleUnits(titlePx), 2).lines;
  if (titleLines.length > 1) {
    titlePx = 62;
    copy = captionCopy();
    titleLines = wrapPosterText(input.title, titleUnits(titlePx), 2).lines;
  }
  if (!titleLines.length) titleLines = ["Happy Horse"];

  const childText = input.childLine.trim();
  const childPx = childText ? fitLineFont(childText, textWidth, KEEPSAKE_CHILD_PX, 44) : 0;
  const childLines = childText ? [childText] : [];
  const titleStep = Math.round(titlePx * 1.12);
  const titleHeight =
    ascent(titlePx) + Math.max(0, titleLines.length - 1) * titleStep + descent(titlePx);
  const childHeight = childLines.length ? ascent(childPx) + descent(childPx) : 0;

  const place = (captionLines: string[], markSize: number) => {
    const captionHeight = captionLines.length ? ascent(KEEPSAKE_CAPTION_PX) + descent(KEEPSAKE_CAPTION_PX) : 0;
    const items = [
      { key: "title" as const, height: titleHeight },
      ...(childHeight ? [{ key: "child" as const, height: childHeight }] : []),
      ...(captionHeight ? [{ key: "caption" as const, height: captionHeight }] : []),
      { key: "logo" as const, height: markSize },
    ];
    const used = items.reduce((sum, item) => sum + item.height, 0);
    const gap = Math.floor((bandHeight - used) / (items.length + 1));
    return { items, gap, markSize };
  };

  let captionLines =
    titleLines.length === 1 && input.caption.trim() ? copy.caption.lines.slice(0, 1) : [];
  let markSize = KEEPSAKE_MARK_PX;
  let placed = place(captionLines, markSize);
  if (placed.gap < 12) {
    captionLines = [];
    placed = place(captionLines, markSize);
  }
  if (placed.gap < 8) {
    markSize = 44;
    placed = place(captionLines, markSize);
  }

  let cursor = bandTop + Math.max(placed.gap, 8);
  let titleTop = cursor;
  let childTop = 0;
  let captionTop = 0;
  let markY = bandTop;
  for (const item of placed.items) {
    if (item.key === "title") titleTop = cursor;
    if (item.key === "child") childTop = cursor;
    if (item.key === "caption") captionTop = cursor;
    if (item.key === "logo") markY = cursor;
    cursor += item.height + Math.max(placed.gap, 8);
  }

  return {
    margin,
    titlePx,
    childPx,
    captionPx: KEEPSAKE_CAPTION_PX,
    titleLines,
    childLines,
    captionLines,
    titleBaseline: titleTop + ascent(titlePx),
    titleStep,
    childBaseline: childLines.length ? childTop + ascent(childPx) : 0,
    captionBaseline: captionLines.length ? captionTop + ascent(KEEPSAKE_CAPTION_PX) : 0,
    markY,
    markSize,
    wordmarkPx: KEEPSAKE_WORDMARK_PX,
    gap: placed.gap,
  };
}

type FooterInput = {
  title: string;
  caption: string;
  dedication: string;
  childName?: string;
  audienceBand?: AgeBand;
  language?: string | null;
};

function footerLines(input: FooterInput) {
  return {
    title: input.title.trim() || "Happy Horse",
    name: (input.childName || input.dedication || "").trim(),
    note: input.caption.trim(),
  };
}

/**
 * Square cover. The scene stays edge to edge. A short cream bar sits on the
 * open ground the prompt reserves, with the child's name, title, and a small mark.
 */
async function composeCover(illustration: Buffer, input: FooterInput): Promise<Buffer> {
  const art = await sharp(illustration)
    .resize(COVER_SIZE, COVER_SIZE, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const lines = footerLines(input);
  const markSize = 44;
  const barHeight = 128;
  const barTop = COVER_SIZE - barHeight;
  const textWidth = COVER_SIZE - POSTER_TEXT_MARGIN * 2 - markSize - 140;
  const titlePx = 40;
  const titleLines = wrapPosterText(lines.title, charsForWidth(lines.title, textWidth, titlePx), 1).lines;
  const title = textBlock(
    titleLines.length ? titleLines : ["Happy Horse"],
    POSTER_TEXT_MARGIN,
    barTop + 46,
    titlePx,
    BRAND_IDENTITY.brown,
    700
  );
  const rowY = COVER_SIZE - 34;
  const child = textBlock(lines.name ? [lines.name] : [], POSTER_TEXT_MARGIN, rowY, 26, BRAND_IDENTITY.brown, 650);
  const markX = COVER_SIZE - POSTER_TEXT_MARGIN - markSize;
  const markY = COVER_SIZE - markSize - 14;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${COVER_SIZE}" height="${COVER_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${barTop}" width="${COVER_SIZE}" height="${barHeight}" fill="${BRAND_IDENTITY.cream}"/>
  ${title.svg}
  ${child.svg}
  ${happyHorseMarkSvg(markX, markY, markSize)}
  <text x="${markX - 10}" y="${markY + 30}" text-anchor="end" fill="${BRAND_IDENTITY.brown}" font-size="18" font-weight="700" font-family="sans-serif">${escapeXml(BRAND_NAME)}</text>
</svg>`;
  return sharp(art)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png()
    .toBuffer();
}

/**
 * 4:5 keepsake. The square scene fills the top 80% edge to edge.
 * Title, caption, dedication, and the Happy Horse mark sit in the band below.
 */
async function composeKeepsake(input: FooterInput & { illustration: Buffer }): Promise<Buffer> {
  const lines = footerLines(input);
  const layout = keepsakeTextLayout({
    title: lines.title,
    childLine: lines.name,
    caption: lines.note,
  });
  const title = textBlock(
    layout.titleLines,
    layout.margin,
    layout.titleBaseline,
    layout.titlePx,
    BRAND_IDENTITY.brown,
    700,
    layout.titleStep
  );
  const child = textBlock(
    layout.childLines,
    layout.margin,
    layout.childBaseline,
    layout.childPx,
    BRAND_IDENTITY.brown,
    650
  );
  const caption = textBlock(
    layout.captionLines,
    layout.margin,
    layout.captionBaseline,
    layout.captionPx,
    "#6b584f",
    500
  );
  const band = KEEPSAKE_HEIGHT - KEEPSAKE_ART_HEIGHT;
  const art = await sharp(input.illustration)
    .resize(KEEPSAKE_WIDTH, KEEPSAKE_ART_HEIGHT, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${KEEPSAKE_WIDTH}" height="${KEEPSAKE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BRAND_IDENTITY.cream}"/>
  <rect x="0" y="${KEEPSAKE_ART_HEIGHT}" width="${KEEPSAKE_WIDTH}" height="${band}" fill="${BRAND_IDENTITY.cream}"/>
  ${title.svg}
  ${child.svg}
  ${caption.svg}
  ${happyHorseMarkSvg(layout.margin, layout.markY, layout.markSize)}
  <text x="${layout.margin + layout.markSize + 12}" y="${layout.markY + Math.round(layout.markSize * 0.7)}" fill="${BRAND_IDENTITY.brown}" font-size="${layout.wordmarkPx}" font-weight="700" font-family="sans-serif">${escapeXml(BRAND_NAME)}</text>
</svg>`;
  return sharp(Buffer.from(svg))
    .composite([{ input: art, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

export async function composeArtworkPng(input: FooterInput & {
  illustration: Buffer;
  kind: "cover" | "keepsake";
}): Promise<Buffer> {
  if (input.kind === "cover") return composeCover(input.illustration, input);
  return composeKeepsake(input);
}

export async function transcodeImageToPng(bytes: Buffer, mime: ImageMime): Promise<Buffer> {
  if (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/webp") {
    throw new Error("Unsupported illustration type.");
  }
  return sharp(bytes).png().toBuffer();
}
