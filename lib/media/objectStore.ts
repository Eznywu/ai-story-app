import { del, get, put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

export type MediaFolder = "posters" | "audio" | "voices";
export type MediaAccess = "public" | "private";

const LOCAL_URL_PREFIX: Record<MediaFolder, string> = {
  posters: "/api/posters/",
  audio: "/api/audio/",
  voices: "/api/voice-sample/",
};

const BLOB_HOST = /^([a-z0-9]+)\.(public|private)\.blob\.vercel-storage\.com$/i;

const PRIVATE_STORAGE_ERROR =
  "Private Blob storage is not configured for this environment. Set BLOB_PRIVATE_READ_WRITE_TOKEN, or BLOB_PRIVATE_STORE_ID together with Vercel OIDC. Refusing to publish private media or store it on local disk.";
const PUBLIC_STORAGE_ERROR =
  "Public Blob storage is not configured for this environment. Set BLOB_PUBLIC_READ_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN.";

/**
 * Required names:
 * - BLOB_PUBLIC_READ_WRITE_TOKEN / BLOB_PUBLIC_STORE_ID: public posters and catalog narration
 * - BLOB_PRIVATE_READ_WRITE_TOKEN / BLOB_PRIVATE_STORE_ID: voice samples and personal narration
 * - BLOB_READ_WRITE_TOKEN / BLOB_STORE_ID: public-only legacy fallback (existing Production store)
 * A private operation never uses the public token. One Blob store has one access mode.
 */
export const mediaBlob = { put, get, del };

type StoreCredential = {
  role: "public" | "private";
  access: MediaAccess;
  legacy: boolean;
  token?: string;
  storeId?: string;
  labels: Set<string>;
};

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function isDeployedEnvironment(): boolean {
  return Boolean(trimEnv("VERCEL") || trimEnv("VERCEL_ENV"));
}

function tokenStoreLabel(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const [vendor, product, scope, storeId] = token.split("_");
  if (vendor !== "vercel" || product !== "blob" || scope !== "rw" || !storeId) return undefined;
  return storeId.toLowerCase();
}

function labelsFor(storeId: string | undefined, token: string | undefined): Set<string> {
  const labels = new Set<string>();
  const fromToken = tokenStoreLabel(token);
  if (fromToken) labels.add(fromToken);
  if (storeId) {
    const bare = storeId.trim().replace(/^store_/i, "").toLowerCase();
    if (bare) labels.add(bare);
  }
  return labels;
}

function configuredStores(): StoreCredential[] {
  const publicToken = trimEnv("BLOB_PUBLIC_READ_WRITE_TOKEN");
  const publicStoreId = trimEnv("BLOB_PUBLIC_STORE_ID");
  const legacyToken = trimEnv("BLOB_READ_WRITE_TOKEN");
  const legacyStoreId = trimEnv("BLOB_STORE_ID");
  const privateToken = trimEnv("BLOB_PRIVATE_READ_WRITE_TOKEN");
  const privateStoreId = trimEnv("BLOB_PRIVATE_STORE_ID");
  const stores: StoreCredential[] = [];

  if (publicToken || publicStoreId) {
    stores.push({
      role: "public",
      access: "public",
      legacy: false,
      token: publicToken,
      storeId: publicStoreId,
      labels: labelsFor(publicStoreId, publicToken),
    });
  }

  const sameLegacyToken = Boolean(publicToken && legacyToken && publicToken === legacyToken);
  if ((legacyToken || legacyStoreId) && !sameLegacyToken) {
    stores.push({
      role: "public",
      access: "public",
      legacy: true,
      token: legacyToken,
      storeId: legacyStoreId,
      labels: labelsFor(legacyStoreId, legacyToken),
    });
  }

  if (privateToken || privateStoreId) {
    stores.push({
      role: "private",
      access: "private",
      legacy: false,
      token: privateToken,
      storeId: privateStoreId,
      labels: labelsFor(privateStoreId, privateToken),
    });
  }
  return stores;
}

function canAuthenticate(store: StoreCredential): boolean {
  if (store.token) return true;
  if (!store.storeId) return false;
  return Boolean(trimEnv("VERCEL_OIDC_TOKEN") || isDeployedEnvironment());
}

function credentialForWrite(access: MediaAccess): StoreCredential | null {
  const stores = configuredStores();
  if (access === "private") return stores.find((store) => store.role === "private") ?? null;
  return stores.find((store) => store.role === "public" && !store.legacy) ?? stores.find((store) => store.role === "public") ?? null;
}

function blobCommand(store: StoreCredential): { token?: string; storeId?: string; oidcToken?: string } {
  if (store.token) return { token: store.token };
  const oidcToken = trimEnv("VERCEL_OIDC_TOKEN");
  return oidcToken ? { storeId: store.storeId, oidcToken } : { storeId: store.storeId };
}

/** Public Blob is available when a public credential can authenticate. Local disk is not Blob. */
export function blobStoreEnabled(): boolean {
  const store = credentialForWrite("public");
  return Boolean(store && canAuthenticate(store));
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

function storageError(access: MediaAccess): string {
  return access === "private" ? PRIVATE_STORAGE_ERROR : PUBLIC_STORAGE_ERROR;
}

function requireWriteCredential(access: MediaAccess): StoreCredential | "local" {
  const store = credentialForWrite(access);
  if (store && canAuthenticate(store)) return store;
  if (isDeployedEnvironment() || store) throw new Error(storageError(access));
  return "local";
}

function credentialForStoredUrl(rawUrl: string): StoreCredential {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Media URL is not a valid Blob URL.");
  }
  if (url.protocol !== "https:") throw new Error("Media URL is not a valid Blob URL.");
  const match = url.hostname.match(BLOB_HOST);
  if (!match) throw new Error(`Media URL host is not an allowlisted Blob store (${url.hostname}).`);
  const label = match[1].toLowerCase();
  const access = match[2].toLowerCase() as MediaAccess;
  const matches = configuredStores().filter(
    (store) => store.access === access && store.labels.has(label) && canAuthenticate(store)
  );
  if (matches.length !== 1) {
    throw new Error(`Media URL is not on a configured ${access} Blob store (${url.hostname}).`);
  }
  return matches[0];
}

function canonicalBlobUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";
  return url.toString();
}

/**
 * Persist bytes and return the URL the app should store and play.
 * Public story media uses the public store. Personal samples and personal narration
 * use the private store only. Deployed environments never fall back to local disk.
 */
export async function saveMediaBytes(options: {
  folder: MediaFolder;
  filename: string;
  body: Buffer;
  contentType: string;
  /** Personal samples and personal narration stay private. Story voices may stay public. */
  access?: MediaAccess;
}): Promise<{ url: string; filename: string; access: MediaAccess }> {
  const filename = options.filename;
  if (!safeFilename(options.folder, filename)) {
    throw new Error("Invalid media filename");
  }
  if (!options.body.length) {
    throw new Error("Empty media");
  }

  const access = options.access ?? "public";
  const destination = requireWriteCredential(access);
  if (destination === "local") {
    const dir = path.join(process.cwd(), "uploads", options.folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), options.body);
    return {
      url: `${LOCAL_URL_PREFIX[options.folder]}${encodeURIComponent(filename)}`,
      filename,
      access: "private",
    };
  }

  const blob = await mediaBlob.put(`${options.folder}/${filename}`, options.body, {
    access,
    ...blobCommand(destination),
    contentType: options.contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  const stored = credentialForStoredUrl(blob.url);
  if (stored.access !== access) {
    throw new Error("Refusing to store a Blob URL from the wrong access mode.");
  }
  return { url: blob.url, filename, access };
}

/** Read a private blob or a local file. Callers must already have checked ownership. */
export async function readPrivateMedia(options: {
  folder: MediaFolder;
  filename?: string | null;
  storageUrl?: string | null;
}): Promise<Buffer | null> {
  const filename = options.filename ?? "";
  const deployed = isDeployedEnvironment();
  if (!deployed) {
    const local = filename ? localMediaPath(options.folder, filename) : null;
    if (local) {
      try {
        return await fs.readFile(local);
      } catch {
        /* A private Blob copy may exist instead. */
      }
    }
  }
  if (!options.storageUrl || !isRemoteMediaUrl(options.storageUrl)) return null;
  const store = credentialForStoredUrl(options.storageUrl);
  const result = await mediaBlob.get(canonicalBlobUrl(options.storageUrl), {
    access: store.access,
    ...blobCommand(store),
    ...(store.access === "private" ? { useCache: false } : {}),
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
  const remote = [...new Set([options.url, options.storageUrl].filter((url): url is string => isRemoteMediaUrl(url)))];
  const grouped = new Map<string, { store: StoreCredential; urls: string[] }>();
  for (const url of remote) {
    const store = credentialForStoredUrl(url);
    const key = `${store.role}:${store.legacy}:${store.storeId ?? ""}:${tokenStoreLabel(store.token) ?? ""}`;
    const group = grouped.get(key) ?? { store, urls: [] };
    group.urls.push(canonicalBlobUrl(url));
    grouped.set(key, group);
  }
  for (const group of grouped.values()) {
    await mediaBlob.del(group.urls, blobCommand(group.store));
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
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[media] cleanup failed for a replaced file:", message);
  });
}

export function localMediaPath(folder: MediaFolder, filename: string): string | null {
  if (!safeFilename(folder, filename)) return null;
  return path.join(process.cwd(), "uploads", folder, filename);
}
