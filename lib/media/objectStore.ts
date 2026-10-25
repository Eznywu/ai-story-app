import { del, put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

export type MediaFolder = "posters" | "audio" | "voices";

const LOCAL_URL_PREFIX: Record<MediaFolder, string> = {
  posters: "/api/posters/",
  audio: "/api/audio/",
  voices: "/api/voice-sample/",
};

/** Public Blob when `BLOB_READ_WRITE_TOKEN` is set. Otherwise files stay in `uploads/`. */
export function blobStoreEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function isRemoteMediaUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith("https://") || value.startsWith("http://");
}

function safeFilename(folder: MediaFolder, filename: string): boolean {
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  if (folder === "posters") return /^poster_[a-z0-9]+\.png$/i.test(filename);
  if (folder === "audio") return /^[a-z0-9][a-z0-9_.-]*\.mp3$/i.test(filename);
  return /^voice_[a-z0-9][a-z0-9_.-]*$/i.test(filename);
}

/**
 * Persist bytes and return the URL the app should store and play.
 * Blob URLs are public and unguessable (story ids are cuids). Streaming them
 * back through a function would hit Vercel's 4.5 MB response limit on longer MP3s.
 */
export async function saveMediaBytes(options: {
  folder: MediaFolder;
  filename: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string; filename: string }> {
  const filename = options.filename;
  if (!safeFilename(options.folder, filename)) {
    throw new Error("Invalid media filename");
  }
  if (!options.body.length) {
    throw new Error("Empty media");
  }

  if (blobStoreEnabled()) {
    const blob = await put(`${options.folder}/${filename}`, options.body, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: options.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
    return { url: blob.url, filename };
  }

  const dir = path.join(process.cwd(), "uploads", options.folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), options.body);
  return {
    url: `${LOCAL_URL_PREFIX[options.folder]}${encodeURIComponent(filename)}`,
    filename,
  };
}

export async function deleteMediaReference(options: {
  folder: MediaFolder;
  filename?: string | null;
  url?: string | null;
}): Promise<void> {
  if (isRemoteMediaUrl(options.url) && blobStoreEnabled()) {
    await del(options.url as string, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch((err: unknown) => {
      console.warn("[media] blob delete failed", err instanceof Error ? err.message : err);
    });
  }
  const filename = options.filename ?? "";
  if (!safeFilename(options.folder, filename)) return;
  const filePath = path.join(process.cwd(), "uploads", options.folder, filename);
  await fs.unlink(filePath).catch(() => {});
}

export function localMediaPath(folder: MediaFolder, filename: string): string | null {
  if (!safeFilename(folder, filename)) return null;
  return path.join(process.cwd(), "uploads", folder, filename);
}
