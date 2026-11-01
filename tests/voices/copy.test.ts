import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { toPublicDefault } from "../../lib/voices/decisions";
import { DEFAULT_NARRATORS, defaultNarratorsFor } from "../../lib/voices/registry";
import { voiceCopy } from "../../lib/voices/uiCopy";

const HAN = /\p{Script=Han}/u;
const LATIN_WORD = /\b(Read by|Close|Create a story|Story voices|My voices|I agree|Start recording|Tonight's theme)\b/;

test("zh-TW picker and recording copy is translated, and English copy stays English", () => {
  const zh = voiceCopy("zh-Hant");
  const en = voiceCopy("en");
  const keys = [
    "storyVoices",
    "myVoices",
    "add",
    "close",
    "createTitle",
    "readBy",
    "agree",
    "record",
    "consentTitle",
    "permissionTitle",
    "micDenied",
    "tooQuiet",
    "clipped",
    "short",
    "deleteTitle",
    "deleteBody",
    "previewTitle",
    "creating",
  ] as const;
  for (const key of keys) {
    assert.notEqual(zh[key], en[key], key);
    assert.match(String(zh[key]), HAN, key);
    assert.equal(LATIN_WORD.test(String(zh[key])), false, key);
    assert.equal(HAN.test(String(en[key])), false, key);
  }
  for (const voice of DEFAULT_NARRATORS) {
    assert.notEqual(voice.description.en, voice.description["zh-Hant"], voice.id);
    assert.match(voice.description["zh-Hant"], HAN, voice.id);
    assert.equal(HAN.test(voice.description.en), false, voice.id);
    const shown = toPublicDefault(voice, "zh-Hant");
    if (shown.languages.includes("zh-Hant")) {
      assert.match(shown.description, HAN, voice.id);
      assert.equal(shown.description.includes(voice.description.en), false);
    }
  }
});

test("picker and add-my-voice sources do not hard-code the English chrome", () => {
  const files = ["app/components/CreateStoryPicker.tsx", "app/components/AddMyVoiceFlow.tsx", "app/components/HappyHorseCheck.tsx"];
  const banned = [
    '"Create a story"',
    '"Read by"',
    '"Story voices"',
    '"My voices"',
    '"I agree"',
    '"Start recording"',
    '"Close"',
    "'Create a story'",
    "'Read by'",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const phrase of banned) {
      assert.equal(source.includes(phrase), false, `${file} still has ${phrase}`);
    }
  }
});

test("each language shows at least five ready voices, Taiwan first, and cross-language voices stay pending", () => {
  const en = defaultNarratorsFor("en").map((voice) => toPublicDefault(voice, "en"));
  const zh = defaultNarratorsFor("zh-Hant").map((voice) => toPublicDefault(voice, "zh-Hant"));
  assert.ok(en.filter((voice) => voice.selectable).length >= 5);
  assert.ok(zh.filter((voice) => voice.selectable).length >= 5);
  const firstFive = zh.filter((voice) => voice.selectable).slice(0, 5);
  for (const voice of firstFive) {
    const narrator = DEFAULT_NARRATORS.find((item) => item.id === voice.id);
    assert.equal(narrator?.locale, "cmn-TW", voice.id);
    assert.equal(voice.nonNativeRisk, false);
  }
  const sunny = zh.find((voice) => voice.id === "story-mark");
  assert.equal(sunny?.nonNativeRisk, true);
  assert.equal(sunny?.selectable, false);
  assert.equal(sunny?.status, "pending_audition");
});
