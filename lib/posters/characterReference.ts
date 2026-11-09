import { sniffImageMime, type ImageMime } from "@/lib/posters/imageBytes";
import { REFERENCE_IMAGE_MAX_EDGE } from "@/lib/posters/artworkPricing";
import { isRemoteMediaUrl, readPrivateMedia } from "@/lib/media/objectStore";

export type CharacterReferenceImage = {
  bytes: Buffer;
  mime: ImageMime;
};

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=\r\n]+)$/i;
const MAX_REFERENCE_BYTES = 8_000_000;

/**
 * Loads a character reference for one image-edit call.
 * Data URLs are decoded locally. An https URL is read only when it is already
 * on a configured Blob store. Any other URL is left as a text character sheet,
 * so poster generation does not fetch an arbitrary host.
 * The bytes are scaled to fit inside 512×512 before they are returned.
 * Image-input tokens for those bytes are billed at $8 per million, on top of
 * the text prompt. See artworkPricing.ts.
 */
export async function loadCharacterReference(
  url: string | null | undefined
): Promise<CharacterReferenceImage | null> {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const raw = await readReferenceBytes(trimmed);
    if (!raw) return null;
    return await limitReferenceImage(raw);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[poster] character reference was not attached", {
      scheme: trimmed.slice(0, trimmed.indexOf(":") > 0 ? trimmed.indexOf(":") : 12),
      message: message.slice(0, 180),
    });
    return null;
  }
}

async function readReferenceBytes(url: string): Promise<Buffer | null> {
  const data = characterReferenceFromDataUrl(url);
  if (data) return data;
  if (!isRemoteMediaUrl(url)) return null;
  return readPrivateMedia({ folder: "posters", storageUrl: url });
}

export function characterReferenceFromDataUrl(url: string): Buffer | null {
  const match = DATA_URL.exec(url.trim());
  if (!match?.[2]) return null;
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!bytes.length || bytes.length > MAX_REFERENCE_BYTES) return null;
  if (!sniffImageMime(bytes)) return null;
  return bytes;
}

async function limitReferenceImage(bytes: Buffer): Promise<CharacterReferenceImage | null> {
  if (!sniffImageMime(bytes) || bytes.length > MAX_REFERENCE_BYTES) return null;
  const sharp = (await import("sharp")).default;
  const png = await sharp(bytes)
    .rotate()
    .resize(REFERENCE_IMAGE_MAX_EDGE, REFERENCE_IMAGE_MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  if (!sniffImageMime(png)) return null;
  return { bytes: png, mime: "image/png" };
}
