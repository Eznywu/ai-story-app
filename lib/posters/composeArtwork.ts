import sharp from "sharp";
import { BRAND_IDENTITY } from "@/lib/brand";
import type { ImageMime } from "@/lib/posters/imageBytes";
import {
  COVER_ART_HEIGHT,
  COVER_SIZE,
  KEEPSAKE_ART_HEIGHT,
  KEEPSAKE_HEIGHT,
  KEEPSAKE_WIDTH,
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
  const step = Math.round(size * 1.25);
  const svg = lines
    .map((line, index) => {
      const baseline = y + index * step;
      return `<text x="${x}" y="${baseline}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="PingFang TC, Noto Sans CJK TC, Noto Sans TC, sans-serif">${escapeXml(line)}</text>`;
    })
    .join("");
  return { svg, nextY: y + lines.length * step };
}

/**
 * Places the whole square illustration in the art band (contained, not cropped)
 * and paints the title, caption, and wordmark underneath it.
 */
export async function composeArtworkPng(input: {
  illustration: Buffer;
  kind: "cover" | "keepsake";
  title: string;
  caption: string;
  dedication: string;
}): Promise<Buffer> {
  const width = input.kind === "cover" ? COVER_SIZE : KEEPSAKE_WIDTH;
  const height = input.kind === "cover" ? COVER_SIZE : KEEPSAKE_HEIGHT;
  const artHeight = input.kind === "cover" ? COVER_ART_HEIGHT : KEEPSAKE_ART_HEIGHT;
  const copy = posterCopy({ title: input.title, caption: input.caption, dedication: input.dedication });
  const titleSize = 30;
  let cursor = artHeight + 40;
  const title = textBlock(copy.title.lines, 56, cursor, titleSize, BRAND_IDENTITY.brown, 700);
  cursor = title.nextY + 8;
  const caption = textBlock(copy.caption.lines, 56, cursor, 22, "#6b584f", 500);
  cursor = caption.nextY + 4;
  const dedication = textBlock(copy.dedication.lines, 56, cursor, 20, BRAND_IDENTITY.terracotta, 600);
  const fitted = await sharp(input.illustration)
    .resize({
      width: Math.min(width - 48, artHeight),
      height: artHeight - 24,
      fit: "contain",
      background: BRAND_IDENTITY.cream,
    })
    .png()
    .toBuffer();
  const meta = await sharp(fitted).metadata();
  const artWidth = meta.width ?? artHeight;
  const drawnHeight = meta.height ?? artHeight;
  const left = Math.round((width - artWidth) / 2);
  const top = Math.round((artHeight - drawnHeight) / 2);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BRAND_IDENTITY.cream}"/>
  ${title.svg}
  ${caption.svg}
  ${dedication.svg}
  <text x="56" y="${height - 28}" fill="${BRAND_IDENTITY.brown}" font-size="22" font-weight="700" font-family="sans-serif">Happy Horse</text>
</svg>`;
  return sharp(Buffer.from(svg))
    .composite([{ input: fitted, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}

export async function transcodeImageToPng(bytes: Buffer, mime: ImageMime): Promise<Buffer> {
  if (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/webp") {
    throw new Error("Unsupported illustration type.");
  }
  return sharp(bytes).png().toBuffer();
}
