import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INTERFACE_LOCALES, storyLanguageFromInterface } from "../../lib/i18n/locales";
import { languagesMatch, normalizeAppLanguage } from "../../lib/voices/language";
import { checkPreviewAudio } from "../../lib/voices/previewAudio";
import { createPersonalVoice, type StoredVoice, type VoiceStore } from "../../lib/voices/personalVoice";
import { voiceProviderFromEnv } from "../../lib/voices/provider";
import {
  RECORDING_SCRIPT_VERSION,
  RECORDING_SCRIPTS,
  parseRecordingLocale,
  providerLanguageLabel,
  readingText,
  recordingLocaleList,
  resolveActiveRecordingScript,
  resolveRecordingMetadata,
  type RecordingLocale,
} from "../../lib/voices/recordingScripts";

const LOCALES = recordingLocaleList();

function speechUnits(locale: RecordingLocale, text: string): number {
  if (locale === "zh-Hant" || locale === "zh-Hans") return text.match(/\p{Script=Han}/gu)?.length ?? 0;
  if (locale === "ja") return text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu)?.length ?? 0;
  return text.split(/\s+/).filter((part) => /\p{L}/u.test(part)).length;
}

/**
 * Comfortable parent-to-child pace, checked against espeak-ng read-throughs where that
 * voice is usable. Mandarin and Japanese espeak voices run far too slowly to time a person,
 * so those two use published narration rates instead (about 220 hanzi/min and 320 kana+kanji/min).
 */
const UNITS_PER_MIN: Record<RecordingLocale, number> = {
  en: 140,
  "zh-Hant": 220,
  "zh-Hans": 220,
  es: 145,
  hi: 150,
  ar: 90,
  fr: 150,
  "pt-BR": 140,
  ru: 120,
  ja: 320,
};

test("recording registry covers the ten interface locales and nothing else", () => {
  assert.deepEqual(
    LOCALES,
    INTERFACE_LOCALES.map((item) => item.code)
  );
  assert.deepEqual(Object.keys(RECORDING_SCRIPTS), LOCALES);
  const passages = new Set<string>();
  for (const locale of LOCALES) {
    const script = RECORDING_SCRIPTS[locale];
    assert.equal(script.locale, locale);
    assert.equal(script.scriptVersion, RECORDING_SCRIPT_VERSION);
    assert.equal(script.scriptVersion, "2026-11-02");
    assert.equal(script.reviewStatus, "pending-fluent-speaker-review");
    assert.ok(script.passage.length > 80, locale);
    assert.ok(script.phrases.length > 20, locale);
    assert.equal(script.passage.split("\n\n").length, 4, locale);
    passages.add(script.passage);
    const spoken = readingText(script);
    assert.equal(spoken.includes(script.passage), true);
    assert.equal(spoken.includes(script.phrases), true);
    assert.equal(spoken.includes("scriptVersion"), false, locale);
    assert.equal(spoken.includes("pending-fluent"), false, locale);
    assert.equal(spoken.includes("##"), false, locale);
    assert.equal(/[\[\]<>]/.test(spoken), false, locale);
    assert.equal(spoken.toLowerCase().includes("ssml"), false, locale);
    assert.equal(spoken.toLowerCase().includes("<speak"), false, locale);
  }
  assert.equal(passages.size, LOCALES.length);
  assert.notEqual(RECORDING_SCRIPTS["zh-Hant"].passage, RECORDING_SCRIPTS["zh-Hans"].passage);
  assert.match(RECORDING_SCRIPTS["zh-Hant"].passage, /家裡/);
  assert.match(RECORDING_SCRIPTS["zh-Hans"].passage, /家里/);
  assert.equal(RECORDING_SCRIPTS["zh-Hant"].passage.includes("家里"), false);
  assert.equal(RECORDING_SCRIPTS["zh-Hans"].passage.includes("家裡"), false);
});

test("recording locales do not fall back to English, and story language stays two-way", () => {
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    assert.notEqual(parseRecordingLocale(locale), null, locale);
    assert.notEqual(RECORDING_SCRIPTS[locale].passage, RECORDING_SCRIPTS.en.passage, locale);
    assert.equal(RECORDING_SCRIPTS[locale].passage.includes("Tonight, the house is quiet"), false, locale);
  }
  assert.equal(parseRecordingLocale("fr"), "fr");
  assert.equal(parseRecordingLocale("ar"), "ar");
  assert.equal(parseRecordingLocale("hi"), "hi");
  assert.equal(parseRecordingLocale("ru"), "ru");
  assert.equal(parseRecordingLocale("ja"), "ja");
  assert.equal(parseRecordingLocale("es"), "es");
  assert.equal(parseRecordingLocale("pt-BR"), "pt-BR");
  assert.equal(parseRecordingLocale("pt"), "pt-BR");
  assert.equal(parseRecordingLocale("zh-TW"), "zh-Hant");
  assert.equal(parseRecordingLocale("zh-CN"), "zh-Hans");
  assert.equal(parseRecordingLocale("zh"), null);
  assert.equal(parseRecordingLocale("de"), null);
  assert.equal(parseRecordingLocale(""), null);
  assert.equal(normalizeAppLanguage("fr"), "en");
  assert.equal(normalizeAppLanguage("ja"), "en");
  assert.notEqual(parseRecordingLocale("fr"), normalizeAppLanguage("fr"));
  assert.equal(storyLanguageFromInterface("fr"), null);
  assert.equal(storyLanguageFromInterface("ja"), null);
  assert.equal(storyLanguageFromInterface("zh-Hans"), null);
  assert.equal(storyLanguageFromInterface("en"), "en");
  assert.equal(storyLanguageFromInterface("zh-Hant"), "zh-Hant");
  assert.equal(languagesMatch(["fr"], "en"), false);
  assert.equal(languagesMatch(["ar"], "zh-Hant"), false);
  assert.equal(languagesMatch(["ja"], "en"), false);
  assert.equal(languagesMatch(["es"], "en"), false);
  assert.equal(languagesMatch(["pt-BR"], "en"), false);
  assert.equal(languagesMatch(["hi"], "en"), false);
  assert.equal(languagesMatch(["ru"], "en"), false);
  assert.equal(languagesMatch(["en"], "en"), true);
  assert.equal(languagesMatch(["en-US"], "en"), true);
  assert.equal(languagesMatch(["zh-Hant"], "zh-Hant"), true);
  assert.equal(languagesMatch(["zh-Hans"], "zh-Hant"), true);
  assert.equal(languagesMatch(["zh-Hans"], "en"), false);
  assert.equal(languagesMatch(["zh-TW"], "zh-Hant"), true);
});

test("an in-progress take keeps the script frozen when the interface locale changes", () => {
  const arabic = RECORDING_SCRIPTS.ar;
  const during = resolveActiveRecordingScript("ja", arabic);
  assert.equal(during.locale, "ar");
  assert.equal(during.scriptVersion, arabic.scriptVersion);
  assert.equal(during.passage, arabic.passage);
  assert.equal(during.phrases, arabic.phrases);
  const idle = resolveActiveRecordingScript("ja", null);
  assert.equal(idle.locale, "ja");
  assert.equal(idle.passage, RECORDING_SCRIPTS.ja.passage);
  const restarted = resolveActiveRecordingScript("fr", null);
  assert.equal(restarted.locale, "fr");
});

test("provider labels name the recorded language, including the two Mandarin scripts", () => {
  assert.equal(providerLanguageLabel("en").language, "en");
  assert.equal(providerLanguageLabel("fr").description, "French");
  assert.equal(providerLanguageLabel("ja").language, "ja");
  assert.match(providerLanguageLabel("pt-BR").description, /Brazilian Portuguese/);
  assert.equal(providerLanguageLabel("pt-BR").language, "pt");
  const traditional = providerLanguageLabel("zh-Hant");
  const simplified = providerLanguageLabel("zh-Hans");
  assert.equal(traditional.language, "zh");
  assert.equal(simplified.language, "zh");
  assert.match(traditional.description, /Traditional/);
  assert.match(simplified.description, /Simplified/);
  assert.equal(traditional.description === simplified.description, false);
  for (const locale of LOCALES) {
    const label = providerLanguageLabel(locale);
    if (locale !== "en") {
      assert.equal(label.description.toLowerCase().includes("english"), false, locale);
      assert.notEqual(label.language, "en", locale);
    }
  }
});

test("save validation keeps recordingLocale and scriptVersion and does not coerce other languages to English", async () => {
  const store = memoryStore();
  const seen: { language?: string; description?: string; providerVoiceId?: string }[] = [];
  const provider = {
    async createClone(input: {
      languageLabel: { language: string; accent: string; description: string };
      name: string;
      bytes: Uint8Array;
      filename: string;
      contentType: string;
    }) {
      const record = input as { providerVoiceId?: string };
      seen.push({
        language: input.languageLabel.language,
        description: input.languageLabel.description,
        providerVoiceId: record.providerVoiceId,
      });
      return { providerVoiceId: "prov-from-server", requiresVerification: false };
    },
    async deleteVoice() {},
    async subscription() {
      return { voiceLimit: 10, slotsUsed: 0 };
    },
  };
  const deps = {
    store,
    provider,
    now: new Date("2026-11-02T00:00:00Z"),
    saveSample: async () => ({ storageUrl: null }),
    deleteSample: async () => {},
  };
  const japanese = await createPersonalVoice(baseInput({ recordingLocale: "ja", language: "ja" }), deps);
  assert.equal(japanese.ok, true);
  if (japanese.ok) {
    assert.equal(japanese.voice.language, "ja");
    assert.equal(japanese.voice.recordingLocale, "ja");
    assert.equal(japanese.voice.scriptVersion, RECORDING_SCRIPT_VERSION);
    assert.notEqual(japanese.voice.language, "en");
  }
  assert.equal(seen[0]?.language, "ja");
  assert.equal(seen[0]?.description, "Japanese");
  assert.equal(seen[0]?.providerVoiceId, undefined);

  const french = await createPersonalVoice(
    baseInput({ language: "fr", recordingLocale: undefined, idempotencyKey: "fr-key" }),
    deps
  );
  assert.equal(french.ok, true);
  if (french.ok) {
    assert.equal(french.voice.recordingLocale, "fr");
    assert.equal(french.voice.language, "fr");
  }

  const german = await createPersonalVoice(baseInput({ language: "de", recordingLocale: undefined, idempotencyKey: "de-key" }), deps);
  assert.equal(german.ok, false);
  if (!german.ok) assert.equal(german.status, 400);

  const mismatch = await createPersonalVoice(
    baseInput({ language: "en", recordingLocale: "ar", idempotencyKey: "mismatch" }),
    deps
  );
  assert.equal(mismatch.ok, false);

  const stale = resolveRecordingMetadata({ recordingLocale: "es", scriptVersion: "1999-01-01", language: "es" });
  assert.equal(stale.ok, false);
  const bareZh = resolveRecordingMetadata({ recordingLocale: "zh", scriptVersion: RECORDING_SCRIPT_VERSION });
  assert.equal(bareZh.ok, false);

  const route = readFileSync("app/api/voice-clone/route.ts", "utf8");
  assert.equal(route.includes('form.get("voiceId")'), false);
  assert.equal(route.includes('form.get("providerVoiceId")'), false);
  const providerSource = readFileSync("lib/voices/provider.ts", "utf8");
  assert.equal(providerSource.includes("removeBackgroundNoise"), false);
});

test("comfortable read-through estimates stay inside 60 to 120 seconds", () => {
  for (const locale of LOCALES) {
    const script = RECORDING_SCRIPTS[locale];
    const units = speechUnits(locale, readingText(script));
    const seconds = (units / UNITS_PER_MIN[locale]) * 60;
    assert.ok(seconds >= 60 && seconds <= 120, `${locale} ${units} units -> ${seconds.toFixed(1)}s`);
  }
});

test("a production-shaped environment does not serve the stand-in preview tone", async () => {
  const tone = readFileSync("lib/providers/fixtures/mock-narration.mp3");
  const checked = checkPreviewAudio(tone);
  assert.equal(checked.ok, false);
  if (!checked.ok) assert.equal(checked.problem, "stand_in");
  const provider = voiceProviderFromEnv({
    VERCEL_ENV: "production",
    NODE_ENV: "production",
    LOCAL_TEST_PARENT: "1",
    MOCK_PROVIDERS: "1",
    ELEVENLABS_API_KEY: "",
  });
  await assert.rejects(
    () =>
      provider.createClone({
        name: "Nope",
        bytes: new Uint8Array([1, 2, 3, 4]),
        filename: "no.webm",
        contentType: "audio/webm",
        languageLabel: providerLanguageLabel("en"),
      }),
    /ElevenLabs API key/
  );
});

function baseInput(extra: { language: string; recordingLocale?: unknown; idempotencyKey?: string }) {
  return {
    userId: "user-a",
    idempotencyKey: extra.idempotencyKey ?? `key-${extra.language}-${String(extra.recordingLocale ?? "")}`,
    name: "Mom",
    language: extra.language,
    recordingLocale: extra.recordingLocale,
    scriptVersion: RECORDING_SCRIPT_VERSION,
    bytes: webm(20000),
    durationMs: 70000,
    voicedMs: 60000,
    clipped: false,
    consentAccepted: true,
    consentTextVersion: "2026-11-01",
    contentType: "audio/webm",
  };
}

function webm(size: number) {
  const bytes = new Uint8Array(size);
  bytes[0] = 0x1a;
  bytes[1] = 0x45;
  bytes[2] = 0xdf;
  bytes[3] = 0xa3;
  return bytes;
}

function memoryStore(): VoiceStore & { rows: StoredVoice[] } {
  const rows: StoredVoice[] = [];
  return {
    rows,
    async findByIdempotency(userId, key) {
      return rows.find((row) => row.userId === userId && row.idempotencyKey === key) ?? null;
    },
    async countActive(userId) {
      return rows.filter((row) => row.userId === userId).length;
    },
    async countAttemptsSince() {
      return 0;
    },
    async recordAttempt() {},
    async insert(voice) {
      rows.push(voice);
    },
    async update() {
      return null;
    },
    async deleteRow() {},
    async addCleanup() {},
    async pendingCleanups() {
      return [];
    },
    async markCleanup() {},
    async storiesUsingVoice() {
      return 0;
    },
    async clearStoryAudio() {
      return 0;
    },
    async deletePreviews() {},
  };
}
