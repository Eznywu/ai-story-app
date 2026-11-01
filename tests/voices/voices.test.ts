import assert from "node:assert/strict";
import test from "node:test";
import { narrationCacheKey } from "../../lib/tts/cacheKey";
import { languageCodeForModel } from "../../lib/tts/modelCapabilities";
import { buildElevenSpeechRequest } from "../../lib/tts/elevenRequest";
import { settingsActuallySent } from "../../lib/tts/config";
import { buildWeeklyReport, selectWeeklyReviewSamples } from "../../lib/tts/review";
import { PREVIEW_SCRIPT } from "../../lib/voices/passages";
import { providerLanguageCode } from "../../lib/voices/language";
import { DEFAULT_NARRATORS, defaultNarratorsFor, looksLikeProviderVoiceId } from "../../lib/voices/registry";
import {
  authorizeOwnedVoice,
  authorizeSynthesis,
  consentAllowsCreate,
  personalVoicesAllowed,
  quotaAllowsCreate,
  selectionAfterLanguageChange,
  toPublicDefault,
  type OwnedVoice,
  type PublicVoice,
} from "../../lib/voices/decisions";
import { checkVoiceUpload, preferredRecorderMime, recordingClipped, voicedDurationMs } from "../../lib/voices/recordingChecks";
import { planVoicePreview } from "../../lib/voices/previewPlan";
import { createPersonalVoice, deletePersonalVoice, type StoredVoice, type VoiceStore } from "../../lib/voices/personalVoice";
import { V3_USD_PER_THOUSAND_CHARS } from "../../lib/tts/pricing";

const settings = settingsActuallySent("legacy-emotion", "eleven_v3", "en");

test("language codes map en and Traditional Chinese, and only supported models send them", () => {
  assert.equal(providerLanguageCode("en"), "en");
  assert.equal(providerLanguageCode("en-US"), "en");
  assert.equal(providerLanguageCode("zh-TW"), "zh");
  assert.equal(providerLanguageCode("zh-Hant"), "zh");
  assert.equal(languageCodeForModel("eleven_v3", "zh-TW"), undefined);
  assert.equal(languageCodeForModel("eleven_multilingual_v2", "en"), undefined);
  assert.equal(languageCodeForModel("eleven_flash_v2_5", "zh-Hant"), "zh");
  assert.equal(languageCodeForModel("eleven_flash_v2_5", "en"), "en");
  const flash = buildElevenSpeechRequest({
    text: "Hello",
    modelId: "eleven_flash_v2_5",
    language: "zh-TW",
    voiceSettings: settings,
  });
  const v3 = buildElevenSpeechRequest({
    text: "Hello",
    modelId: "eleven_v3",
    language: "zh-TW",
    voiceSettings: settings,
  });
  assert.equal(flash.languageCode, "zh");
  assert.equal(v3.languageCode, undefined);
});

test("public defaults cover both languages and hide family clones", () => {
  assert.ok(defaultNarratorsFor("en").length >= 5);
  assert.ok(defaultNarratorsFor("zh-Hant").length >= 5);
  const ids = new Set(DEFAULT_NARRATORS.map((voice) => voice.providerVoiceId));
  assert.equal(ids.size, DEFAULT_NARRATORS.length);
  for (const voice of DEFAULT_NARRATORS) {
    assert.equal(voice.auditionStatus, "pending");
    assert.equal(voice.id.startsWith("story-"), true);
    assert.equal(voice.providerName.includes("Eason"), false);
    assert.equal(voice.providerName.includes("Neva"), false);
    assert.ok(voice.rightsNote.includes("Voice Library"));
  }
  assert.equal(DEFAULT_NARRATORS.some((voice) => voice.id === "Eason_EN"), false);
  const names = DEFAULT_NARRATORS.map((voice) => voice.name);
  assert.equal(new Set(names).size, names.length);
});

test("cache identity keeps historical default keys and separates personal owners", () => {
  const base = {
    script: "Goodnight Bramble.",
    voiceId: "story-david",
    modelId: "eleven_v3",
    voiceSettings: settings,
    dictionaryVersion: "2026-10-27.1",
    configVersion: "config-a",
    language: "en",
  };
  const historical = narrationCacheKey(base);
  assert.equal(narrationCacheKey({ ...base, voiceVersion: 1 }), historical);
  assert.notEqual(narrationCacheKey({ ...base, ownerId: "family-a", voiceVersion: 1 }), historical);
  assert.notEqual(
    narrationCacheKey({ ...base, ownerId: "family-a", voiceVersion: 1 }),
    narrationCacheKey({ ...base, ownerId: "family-b", voiceVersion: 1 })
  );
  assert.notEqual(
    narrationCacheKey({ ...base, ownerId: "family-a", voiceVersion: 1 }),
    narrationCacheKey({ ...base, ownerId: "family-a", voiceVersion: 2 })
  );
});

test("two accounts stay isolated and a provider id cannot authorize a voice", () => {
  const familyA: OwnedVoice = {
    id: "v_family_a",
    userId: "user-a",
    displayName: "Mom",
    language: "en",
    status: "ready",
    voiceVersion: 1,
    requiresVerification: false,
  };
  const useByB = authorizeSynthesis({
    requesterId: "user-b",
    requestedId: "v_family_a",
    language: "en",
    owned: [],
  });
  assert.equal(useByB.ok, false);
  if (!useByB.ok) assert.equal(useByB.status, 404);
  const rename = authorizeOwnedVoice({ requesterId: "user-b", voiceId: "v_family_a", owned: [familyA] });
  assert.equal(rename.ok, false);
  const provider = authorizeSynthesis({
    requesterId: "user-a",
    requestedId: "4LguZr3BgHUrmCOioCQW",
    language: "en",
    owned: [familyA],
  });
  assert.equal(provider.ok, false);
  if (!provider.ok) assert.equal(provider.status, 403);
  assert.equal(looksLikeProviderVoiceId("clone:4LguZr3BgHUrmCOioCQW"), false);
  const prefixed = authorizeSynthesis({
    requesterId: "user-a",
    requestedId: "clone:4LguZr3BgHUrmCOioCQW",
    language: "en",
    owned: [familyA],
  });
  assert.equal(prefixed.ok, false);
  const own = authorizeSynthesis({
    requesterId: "user-a",
    requestedId: "v_family_a",
    language: "en",
    owned: [familyA],
  });
  assert.equal(own.ok, true);
  if (own.ok) assert.equal(own.allowSynthesis, true);
});

test("a pending or deleting personal voice cannot be used, and a parent voice is not replaced", () => {
  const pending: OwnedVoice = {
    id: "v_pending",
    userId: "user-a",
    displayName: "Dad",
    language: "zh-Hant",
    status: "pending_verification",
    voiceVersion: 1,
    requiresVerification: true,
  };
  const blocked = authorizeSynthesis({ requesterId: "user-a", requestedId: "v_pending", language: "zh-Hant", owned: [pending] });
  assert.equal(blocked.ok, false);
  const personal = toPublicDefault(DEFAULT_NARRATORS[0], "en");
  const mine: PublicVoice = {
    id: "v_mom",
    name: "Mom",
    description: "My voice",
    language: "en",
    languages: ["en"],
    group: "mine",
    kind: "personal",
    status: "ready",
    selectable: true,
  };
  const kept = selectionAfterLanguageChange({
    previousId: "v_mom",
    previousKind: "personal",
    language: "zh-Hant",
    voices: [personal, mine],
  });
  assert.equal(kept.voiceId, "v_mom");
  assert.equal(kept.replaced, false);
  assert.equal(kept.notice, "");
  assert.match(kept.personalNote, /還是選著/);
  const same = selectionAfterLanguageChange({
    previousId: personal.id,
    previousKind: "default",
    language: "en",
    voices: [personal],
  });
  assert.equal(same.notice, "");
  assert.equal(same.replaced, false);
});

test("guests cannot own voices, consent and quota are enforced", () => {
  assert.equal(personalVoicesAllowed({ authEnabled: false, email: "guest@local.invalid", guestEmail: "guest@local.invalid" }), false);
  assert.equal(personalVoicesAllowed({ authEnabled: true, email: "guest@local.invalid", guestEmail: "guest@local.invalid" }), false);
  assert.equal(personalVoicesAllowed({ authEnabled: true, email: "a@example.com", guestEmail: "guest@local.invalid" }), true);
  assert.equal(consentAllowsCreate({ accepted: false, textVersion: "2026-11-01" }).ok, false);
  assert.equal(consentAllowsCreate({ accepted: true, textVersion: "old" }).ok, false);
  assert.equal(consentAllowsCreate({ accepted: true, textVersion: "2026-11-01" }).ok, true);
  assert.equal(quotaAllowsCreate({ activeCount: 2, attemptsInLastHour: 0, voiceLimit: null, slotsUsed: null }).ok, false);
  assert.equal(quotaAllowsCreate({ activeCount: 0, attemptsInLastHour: 3, voiceLimit: null, slotsUsed: null }).ok, false);
  assert.equal(quotaAllowsCreate({ activeCount: 0, attemptsInLastHour: 0, voiceLimit: 10, slotsUsed: 10 }).ok, false);
  assert.equal(quotaAllowsCreate({ activeCount: 1, attemptsInLastHour: 0, voiceLimit: 10, slotsUsed: 1 }).ok, true);
});

test("upload checks reject silence, clipping, and odd formats", () => {
  assert.equal(preferredRecorderMime((type) => type === "audio/mp4"), "audio/mp4");
  assert.equal(preferredRecorderMime((type) => type.startsWith("audio/webm")), "audio/webm;codecs=opus");
  const bytes = new Uint8Array(20000);
  bytes[0] = 0x1a;
  bytes[1] = 0x45;
  bytes[2] = 0xdf;
  bytes[3] = 0xa3;
  const ok = checkVoiceUpload({ bytes, durationMs: 70000, voicedMs: 60000, clipped: false });
  assert.equal(ok.ok, true);
  const quiet = checkVoiceUpload({ bytes, durationMs: 70000, voicedMs: 1000, clipped: false });
  assert.equal(quiet.ok, false);
  const hot = checkVoiceUpload({ bytes, durationMs: 70000, voicedMs: 60000, clipped: true });
  assert.equal(hot.ok, false);
  assert.equal(voicedDurationMs([0.01, 0.05, 0.05, 0.01], 4000), 2000);
  assert.equal(recordingClipped(Array.from({ length: 100 }, (_, index) => (index < 5 ? 0.99 : 0.1))), true);
});

test("preview replay does not plan a paid request", () => {
  const narrator = defaultNarratorsFor("en")[0];
  const first = planVoicePreview({
    voiceAppId: narrator.id,
    language: "en",
    ownerId: null,
    voiceVersion: 1,
    providerVoiceId: narrator.providerVoiceId,
    kind: "default",
    selectable: true,
    cached: false,
    narrator,
    env: process.env,
  });
  assert.equal(first.action, "mock");
  assert.equal(first.paid, false);
  const again = planVoicePreview({
    voiceAppId: "v_mom",
    language: "en",
    ownerId: "user-a",
    voiceVersion: 1,
    providerVoiceId: "provider-secret",
    kind: "personal",
    selectable: true,
    cached: true,
    env: { ...process.env, VOICE_PREVIEW_LIVE: "1", VOICE_PREVIEW_DAILY_CAP_USD: "1" },
  });
  assert.equal(again.action, "cache");
  assert.equal(again.paid, false);
  const replay = planVoicePreview({
    voiceAppId: narrator.id,
    language: "en",
    ownerId: null,
    voiceVersion: 1,
    providerVoiceId: narrator.providerVoiceId,
    kind: "default",
    selectable: true,
    cached: true,
    narrator,
    env: process.env,
  });
  assert.equal(replay.action, "cache");
  if (first.action === "mock" && replay.action === "cache") assert.equal(replay.cacheKey, first.cacheKey);
  const store = new Map<string, string>();
  assert.equal(store.has(first.cacheKey), false);
  store.set(first.cacheKey, "mock-mp3");
  assert.equal(store.get(replay.action === "cache" ? replay.cacheKey : ""), "mock-mp3");
  assert.equal(store.size, 1);
});

test("weekly samples can name the voice, language, and whether it is personal", () => {
  const selection = selectWeeklyReviewSamples({
    unresolved: [],
    newClips: [{ id: "clip-1", url: "/api/audio/a.mp3", voiceId: "v_mom", language: "zh-Hant", voiceKind: "personal" }],
  });
  const report = buildWeeklyReport({ weekKey: "2026-11-01", selection, newClipCount: 1 });
  assert.equal(report.samples[0]?.voiceKind, "personal");
  assert.equal(report.samples[0]?.language, "zh-Hant");
  assert.equal(report.samples[0]?.voiceId, "v_mom");
});

test("creating a voice is idempotent and a failed save deletes the provider clone", async () => {
  const store = memoryStore();
  let deleted = "";
  const provider = {
    async createClone() {
      return { providerVoiceId: "prov-1", requiresVerification: false };
    },
    async deleteVoice(id: string) {
      deleted = id;
    },
    async subscription() {
      return { voiceLimit: 10, slotsUsed: 0 };
    },
  };
  const bytes = webm(20000);
  const input = {
    userId: "user-a",
    idempotencyKey: "same-key",
    name: "Mom",
    language: "en",
    bytes,
    durationMs: 70000,
    voicedMs: 60000,
    clipped: false,
    consentAccepted: true,
    consentTextVersion: "2026-11-01",
    contentType: "audio/webm",
  };
  const deps = {
    store,
    provider,
    now: new Date("2026-11-01T00:00:00Z"),
    saveSample: async () => ({ storageUrl: null }),
    deleteSample: async () => {},
  };
  store.failInsert = true;
  const failed = await createPersonalVoice(input, deps);
  assert.equal(failed.ok, false);
  assert.equal(deleted, "prov-1");
  store.failInsert = false;
  deleted = "";
  const created = await createPersonalVoice(input, deps);
  assert.equal(created.ok, true);
  const replay = await createPersonalVoice(input, deps);
  assert.equal(replay.ok, true);
  if (created.ok && replay.ok) assert.equal(replay.voice.id, created.voice.id);
  assert.equal(store.created, 1);
});

test("delete blocks new synthesis immediately and can clear recordings without story text", async () => {
  const store = memoryStore();
  const voice: StoredVoice = {
    id: "v_mom",
    userId: "user-a",
    displayName: "Mom",
    language: "en",
    status: "ready",
    voiceVersion: 1,
    requiresVerification: false,
    providerVoiceId: "prov-1",
    idempotencyKey: null,
    consentTextVersion: "2026-11-01",
    sampleFilename: "voice_abc.webm",
    sampleStorageUrl: null,
  };
  store.rows.push(voice);
  let providerGone = false;
  const result = await deletePersonalVoice(
    { userId: "user-a", voiceId: "v_mom", deleteGeneratedAudio: true },
    {
      store,
      provider: {
        async createClone() {
          throw new Error("no");
        },
        async deleteVoice() {
          providerGone = true;
        },
        async subscription() {
          return { voiceLimit: null, slotsUsed: null };
        },
      },
      findOwned: async (userId, id) => store.rows.find((row) => row.userId === userId && row.id === id) ?? null,
      deleteSample: async () => {},
    }
  );
  assert.equal(result.ok, true);
  assert.equal(providerGone, true);
  assert.equal(store.rows.some((row) => row.id === "v_mom"), false);
  assert.equal(store.cleared, 1);
  assert.equal(store.previewsDeleted, 1);
  const other = authorizeOwnedVoice({ requesterId: "user-b", voiceId: "v_mom", owned: [] });
  assert.equal(other.ok, false);
});

test("a recording that cannot be deleted keeps the voice so the parent can retry", async () => {
  const store = memoryStore();
  store.failClear = true;
  store.rows.push({
    id: "v_dad",
    userId: "user-a",
    displayName: "Dad",
    language: "en",
    status: "ready",
    voiceVersion: 1,
    requiresVerification: false,
    providerVoiceId: "prov-2",
    idempotencyKey: null,
    consentTextVersion: "2026-11-01",
    sampleFilename: null,
    sampleStorageUrl: null,
  });
  let providerCalls = 0;
  const result = await deletePersonalVoice(
    { userId: "user-a", voiceId: "v_dad", deleteGeneratedAudio: true },
    {
      store,
      provider: {
        async createClone() {
          throw new Error("no");
        },
        async deleteVoice() {
          providerCalls += 1;
        },
        async subscription() {
          return { voiceLimit: null, slotsUsed: null };
        },
      },
      findOwned: async (userId, id) => store.rows.find((row) => row.userId === userId && row.id === id) ?? null,
      deleteSample: async () => {},
    }
  );
  assert.equal(result.ok, false);
  assert.equal(providerCalls, 0);
  assert.equal(store.rows.find((row) => row.id === "v_dad")?.status, "delete_failed");
});

test("live preview estimate is a few cents and is not approved by this test", () => {
  const en = PREVIEW_SCRIPT.en.length;
  const zh = PREVIEW_SCRIPT["zh-Hant"].length;
  const previews = (en + zh) * 5;
  const story = 500;
  const usd = ((previews + story) / 1000) * V3_USD_PER_THOUSAND_CHARS;
  assert.ok(usd < 0.2);
  assert.equal(process.env.VOICE_PREVIEW_LIVE, undefined);
});

function webm(size: number) {
  const bytes = new Uint8Array(size);
  bytes[0] = 0x1a;
  bytes[1] = 0x45;
  bytes[2] = 0xdf;
  bytes[3] = 0xa3;
  return bytes;
}

function memoryStore(): VoiceStore & {
  rows: StoredVoice[];
  created: number;
  failInsert: boolean;
  cleared: number;
  failClear: boolean;
  previewsDeleted: number;
} {
  const rows: StoredVoice[] = [];
  const store = {
    rows,
    created: 0,
    failInsert: false,
    cleared: 0,
    async findByIdempotency(userId: string, key: string) {
      return rows.find((row) => row.userId === userId && row.idempotencyKey === key) ?? null;
    },
    async countActive(userId: string) {
      return rows.filter((row) => row.userId === userId).length;
    },
    async countAttemptsSince() {
      return 0;
    },
    async recordAttempt() {},
    async insert(voice: StoredVoice) {
      if (store.failInsert) throw new Error("db down");
      rows.push(voice);
      store.created += 1;
    },
    async update(id: string, userId: string, patch: Partial<StoredVoice>) {
      const row = rows.find((item) => item.id === id && item.userId === userId);
      if (!row) return null;
      Object.assign(row, patch);
      return row;
    },
    async deleteRow(id: string, userId: string) {
      const index = rows.findIndex((item) => item.id === id && item.userId === userId);
      if (index >= 0) rows.splice(index, 1);
    },
    async addCleanup() {},
    async pendingCleanups() {
      return [];
    },
    async markCleanup() {},
    async storiesUsingVoice() {
      return 1;
    },
    async clearStoryAudio() {
      if (store.failClear) throw new Error("blob down");
      store.cleared += 1;
      return 1;
    },
    async deletePreviews() {
      store.previewsDeleted += 1;
    },
    failClear: false,
    previewsDeleted: 0,
  };
  return store;
}
