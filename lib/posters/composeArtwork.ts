import sharp from "sharp";
import { BRAND_IDENTITY } from "@/lib/brand";
import type { ImageMime } from "@/lib/posters/imageBytes";
import { happyHorseMarkSvg } from "@/lib/posters/happyHorseMark";
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

/** Square cover: the illustration already matches the frame, so it goes edge to edge. */
async function composeCover(illustration: Buffer): Promise<Buffer> {
  return sharp(illustration)
    .resize(COVER_SIZE, COVER_SIZE, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

/**
 * 4:5 keepsake. The square scene fills the top 80% edge to edge.
 * Title, caption, dedication, and the Happy Horse mark sit in the band below.
 */
async function composeKeepsake(input: {
  illustration: Buffer;
  title: string;
  caption: string;
  dedication: string;
}): Promise<Buffer> {
  const textWidth = KEEPSAKE_WIDTH - POSTER_TEXT_MARGIN * 2;
  const titlePx = 28;
  const captionPx = 20;
  const copy = posterCopy({
    title: input.title,
    caption: input.caption,
    dedication: input.dedication,
    textWidth,
    titlePx,
    captionPx,
  });
  const art = await sharp(input.illustration)
    .resize(KEEPSAKE_WIDTH, KEEPSAKE_ART_HEIGHT, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  let cursor = KEEPSAKE_ART_HEIGHT + 28;
  const title = textBlock(copy.title.lines, POSTER_TEXT_MARGIN, cursor, titlePx, BRAND_IDENTITY.brown, 700);
  cursor = title.nextY + 8;
  const caption = textBlock(copy.caption.lines, POSTER_TEXT_MARGIN, cursor, captionPx, "#6b584f", 500);
  cursor = caption.nextY + 4;
  const dedication = textBlock(
    copy.dedication.lines,
    POSTER_TEXT_MARGIN,
    cursor,
    20,
    BRAND_IDENTITY.terracotta,
    600
  );
  const markSize = 40;
  const markY = KEEPSAKE_HEIGHT - markSize - 16;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${KEEPSAKE_WIDTH}" height="${KEEPSAKE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BRAND_IDENTITY.cream}"/>
  <rect x="0" y="${KEEPSAKE_ART_HEIGHT}" width="${KEEPSAKE_WIDTH}" height="${KEEPSAKE_HEIGHT - KEEPSAKE_ART_HEIGHT}" fill="${BRAND_IDENTITY.cream}"/>
  ${title.svg}
  ${caption.svg}
  ${dedication.svg}
  ${happyHorseMarkSvg(POSTER_TEXT_MARGIN, markY, markSize)}
  <text x="${POSTER_TEXT_MARGIN + markSize + 12}" y="${markY + 32}" fill="${BRAND_IDENTITY.brown}" font-size="24" font-weight="700" font-family="sans-serif">Happy Horse</text>
</svg>`;
  return sharp(Buffer.from(svg))
    .composite([{ input: art, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

export async function composeArtworkPng(input: {
  illustration: Buffer;
  kind: "cover" | "keepsake";
  title: string;
  caption: string;
  dedication: string;
}): Promise<Buffer> {
  if (input.kind === "cover") return composeCover(input.illustration);
  return composeKeepsake(input);
}

export async function transcodeImageToPng(bytes: Buffer, mime: ImageMime): Promise<Buffer> {
  if (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/webp") {
    throw new Error("Unsupported illustration type.");
  }
  return sharp(bytes).png().toBuffer();
}
