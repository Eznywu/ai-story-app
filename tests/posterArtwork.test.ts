import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { parseAudienceAge } from "../lib/posters/audienceAge.ts";
import { artworkCacheKey } from "../lib/posters/artworkCacheKey.ts";
import { artworkScopeKey } from "../lib/posters/artworkLimits.ts";
import { buildArtworkPrompt } from "../lib/posters/artworkPrompt.ts";
import { luluReferencePrompt } from "../lib/posters/luluReference.ts";
import { coverTextLayout, keepsakePhonePx, keepsakeTextLayout } from "../lib/posters/composeArtwork.ts";
import { posterFooter, savePosterLabel } from "../lib/posters/posterFooter.ts";
import {
  runArtworkRequest,
  type ArtworkJobRow,
  type ArtworkStore,
  type ArtworkStoryRow,
  type ImageProviderResult,
} from "../lib/posters/artworkService.ts";
import { sniffImageMime } from "../lib/posters/imageBytes.ts";
import { generateOneIllustration, mockIllustrationPng } from "../lib/posters/posterImage.ts";
import { mockProvidersEnabled } from "../lib/providers/mockProviders.ts";
import { KEEPSAKE_HEIGHT, keepsakeArtRatio, posterCopy, wrapPosterText } from "../lib/posters/posterLayout.ts";
import { encodeRgbaPng } from "../lib/posters/pngEncode.ts";
import { renderScene, type SceneKind } from "../lib/posters/fixtureScenes.ts";
import {
  FLARE_MEDIUM_REFERENCE_USD,
  FLARE_MEDIUM_REFERENCE_USAGE,
  PRODUCTION_IMAGE_QUALITY,
  estimatedImageUsd,
  posterImageQuality,
} from "../lib/posters/artworkPricing.ts";
import { getMessages } from "../lib/i18n/catalog.ts";
import { INTERFACE_LOCALES } from "../lib/i18n/locales.ts";
import { buildCharacterSnapshot } from "../lib/posters/characterSnapshot.ts";
import {
  deriveVisualBrief,
  splitStoryAndBrief,
  validateVisualBrief,
  VISUAL_BRIEF_MARKER,
} from "../lib/posters/visualBrief.ts";
import { generateStoryWithRetry } from "../lib/stories/storyGenerator.ts";
import { POSTER_EXAMPLES } from "./fixtures/posterExamples.ts";
import { GUEST_EMAIL } from "../lib/auth/config.ts";

const PNG = mockIllustrationPng();

function storyRow(partial: Partial<ArtworkStoryRow> & { id: string }): ArtworkStoryRow {
  return {
    userId: "user_1",
    title: "A quiet evening",
    genre: "Animals",
    text: "Mei held a small lantern and smiled.",
    age: "6 months",
    language: "en",
    mainCharacterName: "Mei",
    childGender: "girl",
    characterSnapshot: POSTER_EXAMPLES[0].character,
    visualBrief: null,
    illustrationUrl: null,
    coverUrl: null,
    posterUrl: null,
    artworkStatus: null,
    artworkCacheKey: null,
    posterCaption: null,
    dedication: null,
    artworkMeta: null,
    ...partial,
  };
}

function createMemoryStore(initial: ArtworkStoryRow[]) {
  const stories = new Map(initial.map((row) => [row.id, { ...row }]));
  const jobs = new Map<string, ArtworkJobRow>();
  const spend = new Map<string, { generations: number; usd: number }>();
  const saved: { illustration: Buffer; cover: Buffer; poster: Buffer }[] = [];

  const store: ArtworkStore = {
    async getStory(userId, storyId) {
      const row = stories.get(storyId);
      if (!row || row.userId !== userId) return null;
      return { ...row };
    },
    async saveBrief(storyId, brief) {
      const row = stories.get(storyId);
      if (!row) return;
      row.visualBrief = brief;
    },
    async findJob(cacheKey) {
      const job = jobs.get(cacheKey);
      return job ? { ...job, illustrationBytes: job.illustrationBytes } : null;
    },
    async insertPending(job) {
      if (jobs.has(job.cacheKey)) return "exists";
      jobs.set(job.cacheKey, { ...job });
      return "inserted";
    },
    async takeLease(cacheKey, until) {
      const job = jobs.get(cacheKey);
      if (!job || job.status === "illustrated") return false;
      if (job.status === "pending" && job.leaseUntil && job.leaseUntil > Date.now()) return false;
      job.status = "pending";
      job.leaseUntil = until;
      return true;
    },
    async reserveSpend({ scopeKey, dayKey, estimateUsd, caps }) {
      const key = `${scopeKey}:${dayKey}`;
      const row = spend.get(key) ?? { generations: 0, usd: 0 };
      if (row.generations + 1 > caps.dailyGenerations) return false;
      if (row.usd + estimateUsd > caps.dailySpendUsd + 1e-9) return false;
      row.generations += 1;
      row.usd += estimateUsd;
      spend.set(key, row);
      return true;
    },
    async saveSuccess(input) {
      const row = stories.get(input.storyId);
      if (!row) throw new Error("missing story");
      saved.push({ illustration: input.illustration, cover: input.cover, poster: input.poster });
      row.artworkStatus = "illustrated";
      row.artworkCacheKey = input.cacheKey;
      row.posterCaption = input.caption;
      row.dedication = input.dedication;
      row.illustrationUrl = `/api/posters/illustration_${input.storyId}.png`;
      row.coverUrl = `/api/posters/cover_${input.storyId}.png`;
      row.posterUrl = `/api/posters/poster_${input.storyId}.png`;
      row.artworkMeta = input.meta;
      if (typeof input.meta.title === "string") row.title = input.meta.title;
      const job = jobs.get(input.cacheKey);
      if (job) {
        job.status = "illustrated";
        job.leaseUntil = null;
        job.blockedUntil = null;
        job.illustrationBytes = input.illustration;
        job.illustrationUrl = row.illustrationUrl;
        job.coverUrl = row.coverUrl;
        job.posterUrl = row.posterUrl;
        job.attemptCount = typeof input.meta.attemptCount === "number" ? input.meta.attemptCount : job.attemptCount + 1;
      }
      return {
        illustrationUrl: row.illustrationUrl,
        coverUrl: row.coverUrl,
        posterUrl: row.posterUrl,
      };
    },
    async saveTerminal(input) {
      const row = stories.get(input.storyId);
      if (row) {
        row.artworkStatus = input.status;
        row.artworkMeta = input.meta;
      }
      const existing = jobs.get(input.cacheKey);
      const job: ArtworkJobRow = existing ?? {
        cacheKey: input.cacheKey,
        scopeKey: "memory",
        storyId: input.storyId,
        status: input.status,
        leaseUntil: null,
        blockedUntil: input.blockedUntil,
        attemptCount: 0,
        estimatedCostUsd: 0,
        illustrationBytes: null,
        illustrationUrl: null,
        coverUrl: null,
        posterUrl: null,
        errorMessage: input.message,
      };
      job.status = input.status;
      job.blockedUntil = input.blockedUntil;
      job.leaseUntil = null;
      job.errorMessage = input.message;
      job.attemptCount =
        typeof input.meta.attemptCount === "number" ? input.meta.attemptCount : job.attemptCount + 1;
      jobs.set(input.cacheKey, job);
      return { coverUrl: row?.coverUrl ?? null, posterUrl: row?.posterUrl ?? null };
    },
    async readIllustration(storyId) {
      const row = stories.get(storyId);
      if (!row?.artworkCacheKey) return null;
      return jobs.get(row.artworkCacheKey)?.illustrationBytes ?? null;
    },
  };

  return { store, stories, jobs, spend, saved };
}

function providerOk(bytes: Buffer = PNG) {
  let calls = 0;
  const prompts: string[] = [];
  const fn = async (input: { prompt: string }): Promise<ImageProviderResult> => {
    calls += 1;
    prompts.push(input.prompt);
    return {
      bytes,
      claimedMime: "image/png",
      model: "mock",
      quality: "low",
      provider: "mock",
      size: "1024x1024",
    };
  };
  return { fn, get calls() { return calls; }, prompts };
}

function composer() {
  const calls: { kind: string; title: string; illustration: Buffer }[] = [];
  return {
    calls,
    async compose(input: { illustration: Buffer; kind: "cover" | "keepsake"; title: string; caption: string; dedication: string }) {
      calls.push({ kind: input.kind, title: input.title, illustration: input.illustration });
      return Buffer.from(`png:${input.kind}:${input.title}`);
    },
  };
}

const baseEnv = {
  POSTER_MAX_ATTEMPTS: "1",
  POSTER_DAILY_GENERATION_CAP: "8",
  POSTER_DAILY_SPEND_CAP_USD: "1",
  POSTER_IMAGE_PROVIDER: "openai",
} as unknown as NodeJS.ProcessEnv;

test("audience age bands stay separate from a protagonist age", () => {
  assert.equal(parseAudienceAge("6 months").band, "0-2");
  assert.equal(parseAudienceAge("2 years").band, "0-2");
  assert.equal(parseAudienceAge("4 years").band, "3-5");
  assert.equal(parseAudienceAge("7 years").band, "6-8");
  assert.equal(parseAudienceAge("10 years").band, "9+");
  assert.equal(parseAudienceAge("9 years").months, 108);
});

test("character appearance and audience age reach the prompt, and genre does not replace the protagonist", () => {
  for (const example of POSTER_EXAMPLES) {
    const brief = deriveVisualBrief({
      title: example.title,
      story: `${example.character.name} waited in a quiet place.`,
      genre: example.genre,
      age: example.age,
      character: example.character,
    });
    const prompt = buildArtworkPrompt({
      audience: parseAudienceAge(example.age),
      character: example.character,
      brief,
      genre: example.genre,
    });
    assert.match(prompt, new RegExp(example.character.name));
    assert.match(prompt, new RegExp(example.character.type));
    assert.match(prompt, new RegExp(example.character.appearance.colours));
    assert.match(prompt, new RegExp(example.character.appearance.clothing));
    assert.match(prompt, new RegExp(example.band.replace("+", "\\+")));
    assert.doesNotMatch(prompt, /No harsh contrast/);
    if (example.band === "0-2") assert.match(prompt, /simple setting/i);
    if (example.band === "6-8" || example.band === "9+") assert.match(prompt, /less babyish/);
    assert.match(prompt, new RegExp(example.age));
    assert.doesNotMatch(prompt, /Story summary:/);
    assert.match(prompt, /must not change/i);
    if (example.character.type === "human child") {
      assert.match(prompt, /human child/);
      assert.match(prompt, /they stay a human child/i);
    }
    if (example.genre === "Mystery" || example.genre === "Adventure") {
      assert.match(prompt, /bedtime/i);
    }
  }
});

test("the Lulu reference prompt is the committed fixture", () => {
  const prompt = luluReferencePrompt();
  const saved = fs.readFileSync(
    new URL("../lib/posters/fixtures/lulu-lantern-path-prompt.txt", import.meta.url),
    "utf8"
  );
  assert.equal(saved.trim(), prompt.trim());
  assert.match(prompt, /Lulu/);
  assert.match(prompt, /blue knitted scarf/);
  assert.match(prompt, /lantern path/i);
  assert.match(prompt, /soft dimensional shading/);
  assert.match(prompt, /foreground/);
  assert.match(prompt, /gpt-image|1024 by 1024|No text/);
});

test("the child line is separate from the character, and phone type is large enough", async () => {
  const older = posterFooter({
    audienceBand: "3-5",
    language: "en",
    listenerName: "Mia",
    characterName: "Lulu",
    title: "Lulu and the Lantern Path",
    moment: "Lulu discovers a lantern path and hops toward the first glowing lantern.",
  });
  assert.equal(older.childLine, "A story for Mia");
  assert.equal(older.parentFacing, false);
  assert.doesNotMatch(older.childLine, /^Lulu$/);
  assert.ok(older.note.length <= 48);
  const zh = posterFooter({
    audienceBand: "3-5",
    language: "zh-Hant",
    listenerName: "Mia",
    characterName: "露露",
    title: "露露與燈籠小路",
    moment: "露露發現燈籠小路",
  });
  assert.equal(zh.childLine, "給 Mia 的故事");
  const baby = posterFooter({
    audienceBand: "0-2",
    language: "en",
    listenerName: "Mei",
    characterName: "Mei",
    title: "Moon",
    moment: "Mei smiles",
  });
  assert.equal(baby.parentFacing, true);
  assert.equal(baby.note, "For you to keep");
  assert.equal(baby.childLine, "A story for Mei");
  const noListener = posterFooter({
    audienceBand: "3-5",
    language: "en",
    characterName: "Lulu",
    title: "Lulu and the Lantern Path",
    moment: "A path",
  });
  assert.equal(noListener.childLine, "");
  assert.equal(savePosterLabel("en"), "Save my poster");
  assert.equal(savePosterLabel("zh-Hant"), "儲存我的海報");

  const hero = keepsakeTextLayout({
    title: older.title,
    childLine: older.childLine,
    caption: older.note,
  });
  assert.equal(hero.titleLines.length, 1);
  assert.equal(hero.childLines[0], "A story for Mia");
  assert.ok(keepsakePhonePx(hero.titlePx) >= 22);
  assert.ok(keepsakePhonePx(hero.childPx) >= 16);
  const coverLayout = coverTextLayout({ title: older.title, childLine: older.childLine });
  assert.equal(coverLayout.titleLines.length, 1);
  assert.equal(coverLayout.childLine, "A story for Mia");
  assert.ok(keepsakePhonePx(coverLayout.titlePx) >= 20, `cover title phone px ${keepsakePhonePx(coverLayout.titlePx)}`);
  assert.ok(keepsakePhonePx(coverLayout.childPx) >= 16, `cover name phone px ${keepsakePhonePx(coverLayout.childPx)}`);
  assert.ok(coverLayout.childBaseline > coverLayout.titleBaseline);
  assert.ok(coverLayout.markY + coverLayout.markSize <= 1080);
  assert.ok(hero.gap >= 12);
  assert.ok(hero.childBaseline > hero.titleBaseline);
  assert.ok(hero.markY > hero.childBaseline);
  assert.ok(hero.markY + hero.markSize <= KEEPSAKE_HEIGHT);

  const zhLayout = keepsakeTextLayout({
    title: zh.title,
    childLine: zh.childLine,
    caption: zh.note,
  });
  assert.equal(zhLayout.titleLines.length, 1);
  assert.equal(zhLayout.childLines[0], "給 Mia 的故事");
  assert.ok(keepsakePhonePx(zhLayout.titlePx) >= 22);

  const wrapped = keepsakeTextLayout({
    title: "Lulu and the Very Long Lantern Path Through the Dark Woods",
    childLine: "A story for Mia",
    caption: "A caption that should drop before it collides with the logo.",
  });
  assert.ok(wrapped.titleLines.length >= 1);
  assert.ok(keepsakePhonePx(wrapped.titlePx) >= 22);
  assert.ok(wrapped.markY + wrapped.markSize <= KEEPSAKE_HEIGHT);
  assert.ok(wrapped.childBaseline + 8 < wrapped.markY);

  const { composeArtworkPng } = await import("../lib/posters/composeArtwork.ts");
  const sharp = (await import("sharp")).default;
  const illustration = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 120, g: 140, b: 160 } },
  })
    .png()
    .toBuffer();
  const poster = await composeArtworkPng({
    illustration,
    kind: "keepsake",
    title: "Lulu and the Lantern Path",
    caption: "Lulu discovers a lantern path.",
    dedication: "A story for Mia",
    childName: "A story for Mia",
  });
  const meta = await sharp(poster).metadata();
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1350);
  const { data, info } = await sharp(poster).raw().toBuffer({ resolveWithObject: true });
  let titleRight = 0;
  for (let y = 1080; y < 1165; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * info.channels;
      const ink = Math.abs(data[i] - 246) + Math.abs(data[i + 1] - 241) + Math.abs(data[i + 2] - 233);
      if (ink > 36 && x > titleRight) titleRight = x;
    }
  }
  assert.ok(titleRight > 400, "title should paint");
  assert.ok(titleRight < info.width - 40, `title runs to x ${titleRight}`);
});

test("a six-month-old listener can keep a rabbit protagonist", () => {
  const rabbit = POSTER_EXAMPLES[1].character;
  const prompt = buildArtworkPrompt({
    audience: parseAudienceAge("6 months"),
    character: { ...rabbit, characterAge: "3 years" },
    brief: deriveVisualBrief({
      title: "Lantern",
      genre: "Animals",
      age: "6 months",
      character: rabbit,
      story: "Lulu hopped once.",
    }),
    genre: "Animals",
  });
  assert.match(prompt, /Audience \(listener\) age: 6 months/);
  assert.match(prompt, /Artwork age band: 0-2/);
  assert.match(prompt, /Protagonist age, kept separate from the listener: 3 years/);
  assert.match(prompt, /Lulu, a rabbit/);
  assert.match(prompt, /do not replace the protagonist/i);
});

test("visual brief validation keeps a valid story when the brief is missing or invalid", () => {
  const story = `Mei smiled at the moon.\n\n${VISUAL_BRIEF_MARKER}\n{not json`;
  const split = splitStoryAndBrief(story, "0-2");
  assert.match(split.story, /Mei smiled/);
  assert.equal(split.visualBrief, null);

  const valid = {
    moment: "Mei holds a lantern",
    protagonist: "Mei, a human child, cream pyjamas",
    setting: "a quiet garden",
    action: "Mei looks up",
    emotion: "calm",
    props: ["lantern"],
    composition: "one character, simple setting",
    ageBand: "0-2",
    genre: "Animals",
  };
  assert.ok(validateVisualBrief(valid));
  assert.equal(validateVisualBrief({ ...valid, props: [] }), null);
  const derived = deriveVisualBrief({
    title: "Moon",
    story: "Mei smiled.",
    genre: "Animals",
    age: "6 months",
    character: POSTER_EXAMPLES[0].character,
  });
  assert.equal(derived.ageBand, "0-2");
  assert.match(derived.protagonist, /human child/);
  assert.doesNotMatch(derived.action, /gentle moment/i);
  assert.match(derived.action, /Mei smiled/);
  const olderBrief = deriveVisualBrief({
    title: "Lantern",
    story: "Lulu hopped toward the lantern.",
    genre: "Adventure",
    age: "7 years",
    character: POSTER_EXAMPLES[1].character,
  });
  assert.equal(olderBrief.ageBand, "6-8");
  assert.match(olderBrief.action, /hopped toward the lantern/);
  assert.match(olderBrief.composition, /Less babyish/);
  assert.match(olderBrief.emotion, /excitement/);
});

test("story generation returns text from one call when the brief is invalid", async () => {
  let calls = 0;
  const generated = await generateStoryWithRetry(
    {
      age: "4 years",
      language: "en",
      mainCharacterName: "Lulu",
      childGender: "any",
      genre: "Adventure",
      length: "short",
      character: {
        name: "Lulu",
        type: "rabbit",
        characterAge: "3 years",
        appearance: { colours: "grey fur", clothing: "blue scarf", proportions: "round", accessories: "bell" },
      },
    },
    {
      retries: 2,
      complete: async (prompt) => {
        calls += 1;
        assert.match(prompt, /Lulu, a rabbit/);
        assert.match(prompt, /3 years/);
        assert.match(prompt, /separate from the listener/);
        assert.match(prompt, /VISUAL_BRIEF_JSON/);
        return "Lulu walked the lantern path and went to sleep.";
      },
    }
  );
  assert.equal(calls, 1);
  assert.match(generated.text, /lantern path/);
  // The brief is derived from the story locally rather than requested again.
  assert.equal(generated.visualBrief?.moment, "Lulu walked the lantern path and went to sleep.");
});

test("cache key ignores title, caption, and dedication", () => {
  const example = POSTER_EXAMPLES[2];
  const brief = deriveVisualBrief({
    title: example.title,
    story: "Momo found a key.",
    genre: example.genre,
    age: example.age,
    character: example.character,
  });
  const base = {
    userId: "family_1",
    storyId: "story_fixed_0001",
    brief,
    character: example.character,
    audience: parseAudienceAge(example.age),
    genre: example.genre,
    provider: "openai",
    model: "gpt-image-2.5-flare",
    quality: "low",
    size: "1024x1024",
  };
  assert.equal(artworkCacheKey(base), artworkCacheKey(base));
  assert.notEqual(
    artworkCacheKey(base),
    artworkCacheKey({ ...base, character: { ...example.character, version: "other" } })
  );
  assert.notEqual(
    artworkCacheKey(base),
    artworkCacheKey({ ...base, audience: parseAudienceAge("6 months") })
  );
});

test("guest limits do not use the shared guest user id alone", () => {
  const a = artworkScopeKey({ userId: "guest_user", email: GUEST_EMAIL, clientKey: "browser-a" });
  const b = artworkScopeKey({ userId: "guest_user", email: GUEST_EMAIL, clientKey: "browser-b" });
  const family = artworkScopeKey({ userId: "guest_user", email: "parent@example.com", clientKey: "browser-a" });
  assert.notEqual(a, b);
  assert.notEqual(a, `family:guest_user`);
  assert.equal(family, "family:guest_user");
});

test("ownership is rejected before any image provider call", async () => {
  const memory = createMemoryStore([storyRow({ id: "story_owned_00001", userId: "owner" })]);
  const image = providerOk();
  const draw = composer();
  const result = await runArtworkRequest(
    { userId: "intruder", email: "parent@example.com", storyId: "story_owned_00001", intent: "create" },
    { store: memory.store, provider: image.fn, compose: draw.compose, env: baseEnv }
  );
  assert.equal(result.httpStatus, 404);
  assert.equal(image.calls, 0);
  assert.equal(draw.calls.length, 0);
});

test("one illustration is reused for the cover and the keepsake", async () => {
  const memory = createMemoryStore([storyRow({ id: "story_reuse_000001" })]);
  const image = providerOk();
  const draw = composer();
  const result = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_reuse_000001", intent: "create" },
    { store: memory.store, provider: image.fn, compose: draw.compose, env: baseEnv }
  );
  assert.equal(result.status, "illustrated");
  assert.equal(image.calls, 1);
  assert.equal(draw.calls.length, 2);
  assert.equal(draw.calls[0].illustration, draw.calls[1].illustration);
  assert.deepEqual(
    draw.calls.map((call) => call.kind).sort(),
    ["cover", "keepsake"]
  );
  assert.equal(memory.stories.get("story_reuse_000001")?.artworkStatus, "illustrated");
  assert.equal(memory.saved.length, 1);
  assert.equal(sniffImageMime(memory.saved[0].illustration), "image/png");
});

test("a title change and a reopen or download do not call the image provider", async () => {
  const memory = createMemoryStore([storyRow({ id: "story_title_000001" })]);
  const image = providerOk();
  const draw = composer();
  const deps = { store: memory.store, provider: image.fn, compose: draw.compose, env: baseEnv };
  await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_title_000001", intent: "create" },
    deps
  );
  const renamed = await runArtworkRequest(
    {
      userId: "user_1",
      email: "parent@example.com",
      storyId: "story_title_000001",
      intent: "create",
      title: "A much longer title for the same saved illustration",
      caption: "A short caption",
    },
    deps
  );
  assert.equal(image.calls, 1);
  assert.equal(renamed.cacheHit, true);
  assert.match(draw.calls.at(-1)?.title ?? "", /much longer title/);
  const beforeDownload = image.calls;
  const download = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_title_000001", intent: "download" },
    deps
  );
  const reload = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_title_000001", intent: "reload" },
    deps
  );
  assert.equal(image.calls, beforeDownload);
  assert.equal(download.providerCalls, 0);
  assert.equal(reload.providerCalls, 0);
  assert.equal(download.status, "illustrated");
});

test("concurrent creates share one job and do not start a second provider call", async () => {
  const memory = createMemoryStore([storyRow({ id: "story_dedup_000001" })]);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const deps = {
    store: memory.store,
    env: baseEnv,
    compose: composer().compose,
    provider: async (): Promise<ImageProviderResult> => {
      calls += 1;
      await gate;
      return {
        bytes: PNG,
        claimedMime: "image/png",
        model: "mock",
        quality: "low",
        provider: "mock",
        size: "1024x1024",
      };
    },
  };
  const first = runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_dedup_000001", intent: "create" },
    deps
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(calls, 1);
  const second = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_dedup_000001", intent: "create" },
    deps
  );
  assert.equal(second.status, "pending");
  assert.equal(calls, 1);
  release();
  const done = await first;
  assert.equal(done.status, "illustrated");
  assert.equal(calls, 1);
});

test("a timeout is not retried, and a second open does not spend again", async () => {
  const memory = createMemoryStore([storyRow({ id: "story_timeout_0001" })]);
  let calls = 0;
  const deps = {
    store: memory.store,
    env: baseEnv,
    compose: composer().compose,
    provider: async (): Promise<ImageProviderResult> => {
      calls += 1;
      throw new Error("OpenAI timed out");
    },
  };
  const first = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_timeout_0001", intent: "create" },
    deps
  );
  const second = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_timeout_0001", intent: "create" },
    deps
  );
  assert.equal(calls, 1);
  assert.equal(first.status, "fallback");
  assert.match(first.error ?? "", /may already have been billed/);
  assert.equal(second.providerCalls, 0);
  assert.notEqual(second.status, "illustrated");
  assert.equal(memory.stories.get("story_timeout_0001")?.artworkStatus, "fallback");
});

test("spending limits apply separately to guest browsers that share one user id", async () => {
  const memory = createMemoryStore([
    storyRow({ id: "story_guest_a_0001", userId: "guest_user" }),
    storyRow({ id: "story_guest_b_0001", userId: "guest_user", genre: "Space" }),
    storyRow({ id: "story_guest_c_0001", userId: "guest_user", genre: "Mystery" }),
  ]);
  const image = providerOk();
  const env = { ...baseEnv, POSTER_DAILY_GENERATION_CAP: "1", POSTER_DAILY_SPEND_CAP_USD: "1" };
  const deps = { store: memory.store, provider: image.fn, compose: composer().compose, env };
  const first = await runArtworkRequest(
    { userId: "guest_user", email: GUEST_EMAIL, clientKey: "browser-a", storyId: "story_guest_a_0001", intent: "create" },
    deps
  );
  const blocked = await runArtworkRequest(
    { userId: "guest_user", email: GUEST_EMAIL, clientKey: "browser-a", storyId: "story_guest_b_0001", intent: "create" },
    deps
  );
  const otherBrowser = await runArtworkRequest(
    { userId: "guest_user", email: GUEST_EMAIL, clientKey: "browser-b", storyId: "story_guest_c_0001", intent: "create" },
    deps
  );
  assert.equal(first.status, "illustrated");
  assert.equal(blocked.httpStatus, 429);
  assert.equal(otherBrowser.status, "illustrated");
  assert.equal(image.calls, 2);
});

test("invalid image bytes are not saved as illustrated artwork", async () => {
  const memory = createMemoryStore([storyRow({ id: "story_bytes_000001" })]);
  const result = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_bytes_000001", intent: "create" },
    {
      store: memory.store,
      env: baseEnv,
      compose: composer().compose,
      provider: async () => ({
        bytes: Buffer.from("this is not an image"),
        claimedMime: "image/png",
        model: "mock",
        quality: "low",
        provider: "mock",
        size: "1024x1024",
      }),
    }
  );
  assert.notEqual(result.status, "illustrated");
  assert.equal(memory.saved.length, 0);
  assert.equal(memory.stories.get("story_bytes_000001")?.artworkStatus === "illustrated", false);
});

test("jpeg bytes are converted before they are stored", async () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
  const memory = createMemoryStore([storyRow({ id: "story_jpeg_0000001" })]);
  let converted = 0;
  const result = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_jpeg_0000001", intent: "create" },
    {
      store: memory.store,
      env: baseEnv,
      compose: composer().compose,
      transcodeToPng: async () => {
        converted += 1;
        return PNG;
      },
      provider: async () => ({
        bytes: jpeg,
        claimedMime: "image/jpeg",
        model: "mock",
        quality: "low",
        provider: "mock",
        size: "1024x1024",
      }),
    }
  );
  assert.equal(converted, 1);
  assert.equal(result.status, "illustrated");
  assert.equal(sniffImageMime(memory.saved[0].illustration), "image/png");
});

test("a legacy story gets a derived brief without another story generation", async () => {
  const row = storyRow({
    id: "story_legacy_00001",
    visualBrief: { moment: "nope" },
    text: "The original bedtime story stays put.",
  });
  const memory = createMemoryStore([row]);
  let legacyCalls = 0;
  await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_legacy_00001", intent: "read" },
    {
      store: memory.store,
      env: { ...baseEnv, ARTWORK_LEGACY_BRIEF: "1" },
      compose: composer().compose,
      provider: async () => {
        throw new Error("provider should not run for a read");
      },
      legacyBrief: async () => {
        legacyCalls += 1;
        return { moment: "still incomplete" };
      },
    }
  );
  assert.equal(legacyCalls, 1);
  assert.equal(memory.stories.get("story_legacy_00001")?.text, "The original bedtime story stays put.");
  const brief = validateVisualBrief(memory.stories.get("story_legacy_00001")?.visualBrief);
  assert.ok(brief);
  assert.match(brief?.protagonist ?? "", /Mei|human child|story character/);
});

test("a keepsake title uses the full text width", () => {
  const copy = posterCopy({
    title: "Mei and the very long lantern evening that keeps going past the garden gate",
    textWidth: 984,
    titlePx: 28,
  });
  assert.ok((copy.title.lines[0]?.length ?? 0) > 36);
});

test("keepsake art is 75 to 80 percent, and English and Traditional Chinese titles stay inside line limits", () => {
  const ratio = keepsakeArtRatio();
  assert.ok(ratio >= 0.75 && ratio <= 0.8);
  const english = wrapPosterText(
    "A very long English title that should break onto several lines and then stop before the extra words",
    28,
    3
  );
  assert.equal(english.lines.length, 3);
  assert.equal(english.truncated, true);
  const chinese = posterCopy({
    title: "安安把星星收回口袋裡的那個很長的晚上月亮還在等一句晚安安安把星星收回口袋裡",
    caption: "一個安靜的畫面，只有安安和一顆小星星。",
    dedication: "給安安",
  });
  assert.ok(chinese.title.lines.length >= 2);
  assert.ok(chinese.title.lines.length <= 3);
  assert.ok(chinese.caption.lines.length <= 2);
  assert.equal(chinese.dedication.lines.length, 1);
  assert.equal(sniffImageMime(encodeRgbaPng(2, 2, () => [0, 0, 0, 255])), "image/png");
});

test("mock poster mode returns a real PNG and does not need sharp or a provider key", async () => {
  const previous = {
    MOCK_PROVIDERS: process.env.MOCK_PROVIDERS,
    VERCEL_ENV: process.env.VERCEL_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };
  process.env.MOCK_PROVIDERS = "1";
  process.env.VERCEL_ENV = "preview";
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(mockProvidersEnabled(), true);
    const image = await generateOneIllustration("a small child and a rabbit in a meadow");
    assert.equal(image.provider, "mock");
    assert.equal(sniffImageMime(image.bytes), "image/png");
    const memory = createMemoryStore([storyRow({ id: "story_mock_poster01" })]);
    const result = await runArtworkRequest(
      { userId: "user_1", email: GUEST_EMAIL, storyId: "story_mock_poster01", intent: "create", clientKey: "qa-browser" },
      {
        store: memory.store,
        provider: async () => image,
        compose: async (input) => input.illustration,
        env: { ...baseEnv, MOCK_PROVIDERS: "1", VERCEL_ENV: "preview" },
      }
    );
    assert.equal(result.httpStatus, 200);
    assert.equal(result.status, "illustrated");
    assert.equal(result.posterUrl?.includes("poster_"), true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Flare prices come from tokens, and medium is the default quality", () => {
  assert.equal(PRODUCTION_IMAGE_QUALITY, "medium");
  assert.equal(posterImageQuality({}), "medium");
  assert.equal(posterImageQuality({ OPENAI_POSTER_IMAGE_QUALITY: "low" }), "low");
  assert.equal(posterImageQuality({ OPENAI_POSTER_IMAGE_QUALITY: "hd" }), "high");
  assert.equal(estimatedImageUsd({ quality: "medium", usage: FLARE_MEDIUM_REFERENCE_USAGE }), 0.0159);
  assert.equal(FLARE_MEDIUM_REFERENCE_USD, 0.0159);
  assert.equal(estimatedImageUsd({ quality: "medium" }), 0.0159);
  assert.notEqual(estimatedImageUsd({ quality: "low" }), 0.006);
  assert.notEqual(estimatedImageUsd({ quality: "medium" }), 0.053);
  assert.notEqual(estimatedImageUsd({ quality: "high" }), 0.211);
  const withReference = estimatedImageUsd({
    quality: "medium",
    usage: { textInputTokens: 546, imageInputTokens: 1000, imageOutputTokens: 439 },
  });
  assert.equal(withReference, 0.0239);
  assert.equal(
    estimatedImageUsd({ quality: "medium", usage: { imageInputTokens: 1_000_000 } }),
    8
  );
});

test("the locked Lulu image is a real medium reference, separate from MOCK scenes", () => {
  const provenance = JSON.parse(
    fs.readFileSync(new URL("../lib/posters/fixtures/references/lulu-lantern-path-medium.json", import.meta.url), "utf8")
  ) as {
    model: string;
    quality: string;
    date: string;
    costUsd: number;
    imageSha256: string;
    prompt: string;
    notAMock: boolean;
  };
  const image = fs.readFileSync(
    new URL("../lib/posters/fixtures/references/lulu-lantern-path-medium.png", import.meta.url)
  );
  assert.equal(createHash("sha256").update(image).digest("hex"), provenance.imageSha256);
  assert.equal(provenance.model, "gpt-image-2.5-flare");
  assert.equal(provenance.quality, "medium");
  assert.equal(provenance.date, "2026-11-08");
  assert.equal(provenance.costUsd, 0.0159);
  assert.equal(provenance.notAMock, true);
  assert.match(provenance.prompt, /Happy Horse palette: cream, brown, terracotta, and sage/);
  const kinds: SceneKind[] = ["human", "rabbit", "dragon", "space"];
  for (const kind of kinds) {
    const painted = renderScene(kind, 640);
    const saved = fs.readFileSync(
      new URL(`../lib/providers/fixtures/mock-scene-${kind}-MOCK.png`, import.meta.url)
    );
    assert.ok(painted.equals(saved), `${kind} mock png drifted from the painter`);
    assert.equal(saved.equals(image), false);
  }
});

test("a stored character reference is attached once, and a foreign URL stays a text sheet", async () => {
  const dataUrl = `data:image/png;base64,${PNG.toString("base64")}`;
  const character = buildCharacterSnapshot({
    id: "char_lulu",
    name: "Lulu",
    type: "rabbit",
    characterAge: "3 years",
    appearance: {
      colours: "soft grey fur with a white chest",
      proportions: "round storybook rabbit",
      clothing: "a blue knitted scarf",
      accessories: "one small brass bell",
    },
    referenceImageUrl: dataUrl,
  });
  const seen: Array<Buffer | null | undefined> = [];
  const memory = createMemoryStore([
    storyRow({
      id: "story_ref_image_01",
      age: "4 years",
      genre: "Adventure",
      text: "Lulu discovers a lantern path and hops toward the first glowing lantern.",
      characterSnapshot: character,
    }),
  ]);
  const result = await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_ref_image_01", intent: "create" },
    {
      store: memory.store,
      env: baseEnv,
      compose: composer().compose,
      provider: async (input) => {
        seen.push(input.referenceImage);
        assert.match(input.prompt, /reference image is attached/i);
        assert.match(input.prompt, /not a generic gentle moment/i);
        assert.doesNotMatch(input.prompt, /No harsh contrast/);
        assert.doesNotMatch(input.prompt, /Happy Horse palette: cream, brown, terracotta, and sage/);
        assert.match(input.prompt, /less babyish|Age band 3/);
        return {
          bytes: PNG,
          claimedMime: "image/png",
          model: "mock",
          quality: "medium",
          provider: "mock",
          size: "1024x1024",
          usage: { textInputTokens: 546, imageInputTokens: 80, imageOutputTokens: 439 },
        };
      },
    }
  );
  assert.equal(result.status, "illustrated");
  assert.equal(seen.length, 1);
  assert.ok(seen[0] && seen[0].length > 0);
  assert.equal(sniffImageMime(seen[0] as Buffer), "image/png");
  assert.equal(result.estimatedCostUsd, 0.0165);

  const foreign = buildCharacterSnapshot({ ...character, referenceImageUrl: "https://evil.example/lulu.png" });
  const foreignSeen: Array<Buffer | null | undefined> = [];
  const foreignStore = createMemoryStore([
    storyRow({ id: "story_ref_foreign1", age: "4 years", characterSnapshot: foreign, text: "Lulu hops." }),
  ]);
  await runArtworkRequest(
    { userId: "user_1", email: "parent@example.com", storyId: "story_ref_foreign1", intent: "create" },
    {
      store: foreignStore.store,
      env: baseEnv,
      compose: composer().compose,
      provider: async (input) => {
        foreignSeen.push(input.referenceImage);
        assert.match(input.prompt, /was not attached/i);
        return {
          bytes: PNG,
          claimedMime: "image/png",
          model: "mock",
          quality: "medium",
          provider: "mock",
          size: "1024x1024",
        };
      },
    }
  );
  assert.equal(foreignSeen[0] ?? null, null);
  const withRef = artworkCacheKey({
    userId: "family_1",
    storyId: "story_fixed_0001",
    brief: deriveVisualBrief({ title: "Lantern", story: "Lulu hops.", genre: "Adventure", age: "4 years", character }),
    character,
    audience: parseAudienceAge("4 years"),
    genre: "Adventure",
    provider: "openai",
    model: "gpt-image-2.5-flare",
    quality: "medium",
    size: "1024x1024",
    referenceAttached: true,
  });
  const withoutBytes = artworkCacheKey({
    userId: "family_1",
    storyId: "story_fixed_0001",
    brief: deriveVisualBrief({ title: "Lantern", story: "Lulu hops.", genre: "Adventure", age: "4 years", character }),
    character,
    audience: parseAudienceAge("4 years"),
    genre: "Adventure",
    provider: "openai",
    model: "gpt-image-2.5-flare",
    quality: "medium",
    size: "1024x1024",
    referenceAttached: false,
  });
  assert.notEqual(withRef, withoutBytes);
});

test("every interface language can say Save my poster", () => {
  assert.equal(getMessages("en").poster.save, "Save my poster");
  assert.equal(getMessages("zh-Hant").poster.save, "儲存我的海報");
  for (const locale of INTERFACE_LOCALES) {
    assert.ok(getMessages(locale.code).poster.save.trim().length >= 2, locale.code);
  }
});

test("a character snapshot does not follow a later profile edit", () => {
  const saved = buildCharacterSnapshot({
    id: "char_1",
    version: "v1",
    name: "Mei",
    type: "human child",
    appearance: { colours: "black hair", clothing: "cream pyjamas", proportions: "small", accessories: "clip" },
  });
  const edited = buildCharacterSnapshot({
    id: "char_1",
    name: "Mei",
    type: "human child",
    appearance: { colours: "red coat", clothing: "boots", proportions: "small", accessories: "none" },
  });
  assert.equal(saved.appearance.clothing, "cream pyjamas");
  assert.notEqual(saved.version, edited.version);
});
