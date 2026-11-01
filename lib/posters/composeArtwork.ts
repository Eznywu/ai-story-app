import sharp from "sharp";
import { BRAND_IDENTITY } from "@/lib/brand";
import type { ImageMime } from "@/lib/posters/imageBytes";
import { happyHorseMarkSvg } from "@/lib/posters/happyHorseMark";
import type { AgeBand } from "@/lib/posters/audienceAge";
import {
  COVER_SIZE,
  KEEPSAKE_ART_HEIGHT,
  KEEPSAKE_HEIGHT,
  KEEPSAKE_WIDTH,
  POSTER_TEXT_MARGIN,
  posterCopy,
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
  weight: number
): { svg: string; nextY: number } {
  const step = Math.round(size * 1.22);
  const svg = lines
    .map((line, index) => {
      const baseline = y + index * step;
      return `<text x="${x}" y="${baseline}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="PingFang TC, Noto Sans CJK TC, Noto Sans TC, sans-serif">${escapeXml(line)}</text>`;
    })
    .join("");
  return { svg, nextY: y + Math.max(lines.length, 0) * step };
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
    name: (input.childName ?? "").trim(),
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
  const textWidth = COVER_SIZE - POSTER_TEXT_MARGIN * 2 - 72;
  const copy = posterCopy({
    title: lines.title,
    caption: lines.name,
    dedication: lines.note,
    textWidth,
    titlePx: 28,
    captionPx: 20,
  });
  const barTop = COVER_SIZE - 112;
  const title = textBlock(copy.title.lines.slice(0, 2), POSTER_TEXT_MARGIN, barTop + 34, 28, BRAND_IDENTITY.brown, 700);
  const name = textBlock(
    lines.name ? [lines.name] : [],
    POSTER_TEXT_MARGIN,
    title.nextY + 4,
    20,
    BRAND_IDENTITY.brown,
    600
  );
  const markSize = 32;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${COVER_SIZE}" height="${COVER_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${barTop}" width="${COVER_SIZE}" height="${COVER_SIZE - barTop}" fill="${BRAND_IDENTITY.cream}"/>
  ${title.svg}
  ${name.svg}
  ${happyHorseMarkSvg(COVER_SIZE - POSTER_TEXT_MARGIN - markSize, COVER_SIZE - markSize - 18, markSize)}
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
  const textWidth = KEEPSAKE_WIDTH - POSTER_TEXT_MARGIN * 2;
  const titlePx = 30;
  const captionPx = 20;
  const copy = posterCopy({
    title: lines.title,
    caption: lines.note,
    dedication: lines.name,
    textWidth,
    titlePx,
    captionPx,
  });
  const art = await sharp(input.illustration)
    .resize(KEEPSAKE_WIDTH, KEEPSAKE_ART_HEIGHT, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  let cursor = KEEPSAKE_ART_HEIGHT + 28;
  const title = textBlock(copy.title.lines.slice(0, 2), POSTER_TEXT_MARGIN, cursor, titlePx, BRAND_IDENTITY.brown, 700);
  cursor = title.nextY + 6;
  const name = textBlock(
    lines.name ? [lines.name] : [],
    POSTER_TEXT_MARGIN,
    cursor,
    22,
    BRAND_IDENTITY.brown,
    700
  );
  cursor = name.nextY + 4;
  const caption = textBlock(copy.caption.lines.slice(0, 2), POSTER_TEXT_MARGIN, cursor, captionPx, "#6b584f", 500);
  const markSize = 32;
  const markY = KEEPSAKE_HEIGHT - markSize - 14;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${KEEPSAKE_WIDTH}" height="${KEEPSAKE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BRAND_IDENTITY.cream}"/>
  <rect x="0" y="${KEEPSAKE_ART_HEIGHT}" width="${KEEPSAKE_WIDTH}" height="${KEEPSAKE_HEIGHT - KEEPSAKE_ART_HEIGHT}" fill="${BRAND_IDENTITY.cream}"/>
  ${title.svg}
  ${name.svg}
  ${caption.svg}
  ${happyHorseMarkSvg(KEEPSAKE_WIDTH - POSTER_TEXT_MARGIN - markSize, markY, markSize)}
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
