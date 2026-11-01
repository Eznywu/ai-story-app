import { del, get, put } from "@vercel/blob";
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
  if (folder === "posters") return /^(poster|illustration|cover)_[a-z0-9]+\.png$/i.test(filename);
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
  /** Personal samples and personal narration stay private. Story voices may stay public. */
  access?: "public" | "private";
}): Promise<{ url: string; filename: string; access: "public" | "private" }> {
  const filename = options.filename;
  if (!safeFilename(options.folder, filename)) {
    throw new Error("Invalid media filename");
  }
  if (!options.body.length) {
    throw new Error("Empty media");
  }

  const access = options.access ?? "public";
  if (blobStoreEnabled()) {
    const blob = await put(`${options.folder}/${filename}`, options.body, {
      access,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: options.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: access === "private" ? 0 : 60,
    });
    return { url: blob.url, filename, access };
  }

  const dir = path.join(process.cwd(), "uploads", options.folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), options.body);
  return {
    url: `${LOCAL_URL_PREFIX[options.folder]}${encodeURIComponent(filename)}`,
    filename,
    access: "private",
  };
}

/** Read a private blob or a local file. Callers must already have checked ownership. */
export async function readPrivateMedia(options: {
  folder: MediaFolder;
  filename?: string | null;
  storageUrl?: string | null;
}): Promise<Buffer | null> {
  const filename = options.filename ?? "";
  const local = filename ? localMediaPath(options.folder, filename) : null;
  if (local) {
    try {
      return await fs.readFile(local);
    } catch {
      /* A private Blob copy may exist instead. */
    }
  }
  if (!options.storageUrl || !isRemoteMediaUrl(options.storageUrl) || !blobStoreEnabled()) return null;
  const result = await get(options.storageUrl, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode === 304 || !result.stream) return null;
  const reader = result.stream.getReader();
  const chunks: Buffer[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    if (next.value?.byteLength) chunks.push(Buffer.from(next.value));
  }
  return Buffer.concat(chunks);
}

type MediaReference = {
  folder: MediaFolder;
  filename?: string | null;
  /** Public playback URL and/or the private storage URL. Each remote URL is deleted. */
  url?: string | null;
  storageUrl?: string | null;
};

/**
 * Deletes the Blob copy and the local copy. Throws when a Blob delete fails so a
 * user-requested deletion is not reported as done while the media still exists.
 */
export async function deleteMediaReference(options: MediaReference): Promise<void> {
  const remote = new Set([options.url, options.storageUrl].filter((url): url is string => isRemoteMediaUrl(url)));
  if (remote.size && blobStoreEnabled()) {
    await del([...remote], { token: process.env.BLOB_READ_WRITE_TOKEN });
  }
  const filename = options.filename ?? "";
  if (!safeFilename(options.folder, filename)) return;
  const filePath = path.join(process.cwd(), "uploads", options.folder, filename);
  await fs.unlink(filePath).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "ENOENT") throw err;
  });
}

/** For a file that a newer copy has already replaced. A leftover file is logged, not raised. */
export async function deleteReplacedMedia(options: MediaReference): Promise<void> {
  await deleteMediaReference(options).catch((err: unknown) => {
    console.warn("[media] could not delete a replaced file", err instanceof Error ? err.message : err);
  });
}

export function localMediaPath(folder: MediaFolder, filename: string): string | null {
  if (!safeFilename(folder, filename)) return null;
  return path.join(process.cwd(), "uploads", folder, filename);
}
