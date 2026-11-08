export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export function sniffImageMime(bytes: Buffer): ImageMime | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function mimeAgrees(claimed: string | null | undefined, sniffed: ImageMime): boolean {
  if (!claimed) return true;
  const value = claimed.toLowerCase().split(";")[0].trim();
  if (value === "image/jpg") return sniffed === "image/jpeg";
  return value === sniffed;
}
