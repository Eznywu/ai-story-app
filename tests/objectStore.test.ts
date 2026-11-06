import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import test from "node:test";
import { mediaBlob, deleteMediaReference, deleteReplacedMedia, readPrivateMedia, saveMediaBytes } from "../lib/media/objectStore.ts";

const BLOB_ENV = [
  "BLOB_PUBLIC_READ_WRITE_TOKEN",
  "BLOB_PUBLIC_STORE_ID",
  "BLOB_PRIVATE_READ_WRITE_TOKEN",
  "BLOB_PRIVATE_STORE_ID",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_OIDC_TOKEN",
] as const;

const PUBLIC_TOKEN = "vercel_blob_rw_previewpublic01_notasecret";
const PRIVATE_TOKEN = "vercel_blob_rw_previewprivate1_notasecret";
const LEGACY_TOKEN = "vercel_blob_rw_prodpublic0001_notasecret";

type RecordedOptions = { token?: string; access?: string; storeId?: string; oidcToken?: string };
type Call = { op: string; pathname?: string; url?: string; urls?: string[]; options?: RecordedOptions };

function recordedOptions(options: object | undefined): RecordedOptions {
  const value = options as RecordedOptions | undefined;
  return {
    token: value?.token,
    access: value?.access,
    storeId: value?.storeId,
    oidcToken: value?.oidcToken,
  };
}

const calls: Call[] = [];
const original = {
  put: mediaBlob.put,
  get: mediaBlob.get,
  del: mediaBlob.del,
};

function installBlobMock() {
  calls.length = 0;
  mediaBlob.put = (async (pathname: string, _body: Parameters<typeof original.put>[1], options: Parameters<typeof original.put>[2]) => {
    calls.push({ op: "put", pathname, options: recordedOptions(options) });
    const token = options.token ?? "";
    const label = token.split("_")[3] || "oidcstore";
    const access = options.access;
    return { url: `https://${label}.${access}.blob.vercel-storage.com/${pathname}` } as Awaited<ReturnType<typeof original.put>>;
  }) as typeof mediaBlob.put;
  mediaBlob.del = (async (urls: Parameters<typeof original.del>[0], options?: Parameters<typeof original.del>[1]) => {
    calls.push({
      op: "del",
      urls: Array.isArray(urls) ? [...urls] : [urls],
      options: recordedOptions(options),
    });
  }) as typeof mediaBlob.del;
  mediaBlob.get = (async (url: string, options: Parameters<typeof original.get>[1]) => {
    calls.push({ op: "get", url, options: recordedOptions(options) });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([9, 8, 7]));
        controller.close();
      },
    });
    return { statusCode: 200, stream, blob: { url } };
  }) as typeof mediaBlob.get;
}

async function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = new Map(BLOB_ENV.map((key) => [key, process.env[key]]));
  const cwd = process.cwd();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "object-store-"));
  process.chdir(dir);
  for (const key of BLOB_ENV) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  installBlobMock();
  try {
    await run();
  } finally {
    process.chdir(cwd);
    await fs.rm(dir, { recursive: true, force: true });
    mediaBlob.put = original.put;
    mediaBlob.get = original.get;
    mediaBlob.del = original.del;
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("public writes use the public token and not the private or legacy token", async () => {
  await withEnv(
    {
      BLOB_PUBLIC_READ_WRITE_TOKEN: PUBLIC_TOKEN,
      BLOB_PRIVATE_READ_WRITE_TOKEN: PRIVATE_TOKEN,
      BLOB_READ_WRITE_TOKEN: LEGACY_TOKEN,
    },
    async () => {
      const saved = await saveMediaBytes({
        folder: "posters",
        filename: "poster_abc.png",
        body: Buffer.from("png"),
        contentType: "image/png",
      });
      assert.equal(saved.access, "public");
      assert.equal(saved.url, "https://previewpublic01.public.blob.vercel-storage.com/posters/poster_abc.png");
      assert.equal(calls.length, 1);
      assert.equal(calls[0].options?.token, PUBLIC_TOKEN);
      assert.equal(calls[0].options?.access, "public");
    }
  );
});

test("public writes fall back to the legacy public token", async () => {
  await withEnv({ BLOB_READ_WRITE_TOKEN: LEGACY_TOKEN, BLOB_STORE_ID: "store_OL9mqCD4asYj28Dp" }, async () => {
    const saved = await saveMediaBytes({
      folder: "audio",
      filename: "audio_story.mp3",
      body: Buffer.from("mp3"),
      contentType: "audio/mpeg",
    });
    assert.equal(calls[0].options?.token, LEGACY_TOKEN);
    assert.equal(saved.url.includes("prodpublic0001.public.blob.vercel-storage.com"), true);
  });
});

test("private writes use only the private token", async () => {
  await withEnv(
    {
      BLOB_PUBLIC_READ_WRITE_TOKEN: PUBLIC_TOKEN,
      BLOB_PRIVATE_READ_WRITE_TOKEN: PRIVATE_TOKEN,
      BLOB_READ_WRITE_TOKEN: LEGACY_TOKEN,
    },
    async () => {
      const saved = await saveMediaBytes({
        folder: "voices",
        filename: "voice_parent",
        body: Buffer.from("wav"),
        contentType: "audio/wav",
        access: "private",
      });
      assert.equal(saved.access, "private");
      assert.equal(calls[0].options?.token, PRIVATE_TOKEN);
      assert.equal(calls[0].options?.access, "private");
      assert.equal(String(saved.url).includes(".private.blob.vercel-storage.com"), true);
    }
  );
});

test("a deployed environment without a private credential does not write local or public bytes", async () => {
  await withEnv({ VERCEL: "1", VERCEL_ENV: "preview", BLOB_READ_WRITE_TOKEN: LEGACY_TOKEN }, async () => {
    await assert.rejects(
      () =>
        saveMediaBytes({
          folder: "voices",
          filename: "voice_parent",
          body: Buffer.from("wav"),
          contentType: "audio/wav",
          access: "private",
        }),
      /Private Blob storage is not configured/
    );
    assert.equal(calls.length, 0);
    await assert.rejects(fs.access(path.join(process.cwd(), "uploads", "voices", "voice_parent")));
  });
});

test("local development without Blob credentials stores a private file on disk", async () => {
  await withEnv({}, async () => {
    const saved = await saveMediaBytes({
      folder: "voices",
      filename: "voice_parent",
      body: Buffer.from("wav"),
      contentType: "audio/wav",
      access: "private",
    });
    assert.equal(calls.length, 0);
    assert.equal(saved.url, "/api/voice-sample/voice_parent");
    const disk = await fs.readFile(path.join(process.cwd(), "uploads", "voices", "voice_parent"));
    assert.equal(disk.toString(), "wav");
  });
});

test("private OIDC routing passes the private store id and not the public token", async () => {
  await withEnv(
    {
      VERCEL: "1",
      VERCEL_OIDC_TOKEN: "oidc-test-token",
      BLOB_PRIVATE_STORE_ID: "store_1ygSRbG7RlMLykAz",
      BLOB_READ_WRITE_TOKEN: LEGACY_TOKEN,
    },
    async () => {
      mediaBlob.put = (async (pathname: string, _body: Parameters<typeof original.put>[1], options: Parameters<typeof original.put>[2]) => {
        calls.push({ op: "put", pathname, options: recordedOptions(options) });
        return {
          url: "https://1ygsrbg7rlmlykaz.private.blob.vercel-storage.com/" + pathname,
        } as Awaited<ReturnType<typeof original.put>>;
      }) as typeof mediaBlob.put;
      await saveMediaBytes({
        folder: "audio",
        filename: "audio_personal.mp3",
        body: Buffer.from("mp3"),
        contentType: "audio/mpeg",
        access: "private",
      });
      assert.equal(calls[0].options?.token, undefined);
      assert.equal(calls[0].options?.storeId, "store_1ygSRbG7RlMLykAz");
      assert.equal(calls[0].options?.oidcToken, "oidc-test-token");
      assert.equal(calls[0].options?.access, "private");
    }
  );
});

test("reads and deletes follow the allowlisted store for each saved URL", async () => {
  await withEnv(
    {
      BLOB_PUBLIC_READ_WRITE_TOKEN: PUBLIC_TOKEN,
      BLOB_PRIVATE_READ_WRITE_TOKEN: PRIVATE_TOKEN,
      BLOB_READ_WRITE_TOKEN: LEGACY_TOKEN,
      BLOB_STORE_ID: "store_OL9mqCD4asYj28Dp",
    },
    async () => {
      const bytes = await readPrivateMedia({
        folder: "voices",
        filename: "voice_parent",
        storageUrl: "https://previewprivate1.private.blob.vercel-storage.com/voices/voice_parent?download=1",
      });
      assert.deepEqual([...bytes!], [9, 8, 7]);
      assert.equal(calls[0].op, "get");
      assert.equal(calls[0].options?.token, PRIVATE_TOKEN);
      assert.equal(calls[0].options?.access, "private");
      assert.equal(calls[0].url, "https://previewprivate1.private.blob.vercel-storage.com/voices/voice_parent");

      await deleteMediaReference({
        folder: "audio",
        filename: "audio_story.mp3",
        url: "https://prodpublic0001.public.blob.vercel-storage.com/audio/audio_story.mp3",
        storageUrl: "https://previewprivate1.private.blob.vercel-storage.com/audio/audio_personal.mp3",
      });
      const deletes = calls.filter((call) => call.op === "del");
      assert.equal(deletes.length, 2);
      const byToken = new Map(deletes.map((call) => [call.options?.token, call.urls]));
      assert.deepEqual(byToken.get(LEGACY_TOKEN), [
        "https://prodpublic0001.public.blob.vercel-storage.com/audio/audio_story.mp3",
      ]);
      assert.deepEqual(byToken.get(PRIVATE_TOKEN), [
        "https://previewprivate1.private.blob.vercel-storage.com/audio/audio_personal.mp3",
      ]);
    }
  );
});

test("cleanup of an unknown Blob host fails instead of using another store token", async () => {
  await withEnv({ BLOB_PRIVATE_READ_WRITE_TOKEN: PRIVATE_TOKEN, BLOB_READ_WRITE_TOKEN: LEGACY_TOKEN }, async () => {
    await assert.rejects(
      () =>
        deleteMediaReference({
          folder: "voices",
          filename: "voice_parent",
          url: "https://evil.example/voices/voice_parent",
        }),
      /not an allowlisted Blob store/
    );
    await assert.rejects(
      () =>
        deleteMediaReference({
          folder: "posters",
          filename: "poster_abc.png",
          url: "https://unknownstore.public.blob.vercel-storage.com/posters/poster_abc.png",
        }),
      /not on a configured public Blob store/
    );
    assert.equal(calls.some((call) => call.op === "del"), false);
  });
});

test("replaced-file cleanup reports the failure and does not throw", async () => {
  await withEnv({ BLOB_PUBLIC_READ_WRITE_TOKEN: PUBLIC_TOKEN }, async () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };
    try {
      await deleteReplacedMedia({
        folder: "posters",
        filename: "poster_old.png",
        url: "https://prodpublic0001.public.blob.vercel-storage.com/posters/poster_old.png",
      });
    } finally {
      console.warn = originalWarn;
    }
    assert.equal(calls.some((call) => call.op === "del"), false);
    assert.match(warnings.join("\n"), /cleanup failed for a replaced file/);
  });
});
