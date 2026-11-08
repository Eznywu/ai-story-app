import assert from "node:assert/strict";
import test from "node:test";
import { activeNarrationSpeed, activeTtsConfig } from "../lib/tts/config.ts";
import { pronunciationDictionaryVersion } from "../lib/tts/dictionaryFile.ts";
import { savedAudioIdentityStatus } from "../lib/tts/audioIdentity.ts";
import {
  defaultNarratorId,
  narratorAfterVoicesLoad,
  narratorForOpenStory,
  type NarratorChoice,
} from "../lib/voices/narratorChoice.ts";

const voices: NarratorChoice[] = [
  { id: "story-grandpa", languages: ["en"], selectable: true, isDefault: true, group: "story" },
  { id: "story-mark", languages: ["en"], selectable: true, group: "story" },
  { id: "story-tuntun", languages: ["zh-Hant"], selectable: false, isDefault: false, group: "story" },
  { id: "story-nuan-ready", languages: ["zh-Hant"], selectable: true, isDefault: true, group: "story" },
];

const englishList: NarratorChoice[] = voices.map((voice) =>
  voice.id === "story-tuntun" ? { ...voice, selectable: false, isDefault: false } : voice
);
const chineseList: NarratorChoice[] = voices.map((voice) => {
  if (voice.id === "story-tuntun") return { ...voice, selectable: true, isDefault: false };
  if (voice.languages?.[0] === "en") return { ...voice, selectable: false, isDefault: false };
  return voice;
});

test("an English story does not keep the automatic Chinese default", () => {
  assert.equal(defaultNarratorId(englishList, "en"), "story-grandpa");
  assert.equal(
    narratorAfterVoicesLoad({
      voices: englishList,
      language: "en",
      previousId: "story-tuntun",
      saved: { voiceId: "story-tuntun", language: "zh-Hant" },
      explicitId: null,
    }),
    "story-grandpa"
  );
});

test("an explicit mismatched voice stays selected and is not replaced", () => {
  assert.equal(
    narratorAfterVoicesLoad({
      voices: englishList,
      language: "en",
      previousId: "",
      saved: { voiceId: "story-tuntun", language: "en" },
      explicitId: null,
    }),
    "story-tuntun"
  );
  assert.equal(
    narratorAfterVoicesLoad({
      voices: englishList,
      language: "en",
      previousId: "story-grandpa",
      saved: null,
      explicitId: "story-tuntun",
    }),
    "story-tuntun"
  );
});

test("a saved recording wins over the create-page voice query", () => {
  const opened = narratorForOpenStory({
    voices: englishList,
    language: "en",
    savedVoiceId: "story-mark",
    queryVoiceId: "story-tuntun",
  });
  assert.equal(opened, "story-mark");
  const expected = {
    configVersion: activeTtsConfig().version,
    dictionaryVersion: pronunciationDictionaryVersion(),
    modelId: activeTtsConfig().modelId,
  };
  const speed = activeNarrationSpeed();
  assert.equal(
    savedAudioIdentityStatus(
      {
        audioUrl: "https://example.public.blob.vercel-storage.com/audio/fresh.mp3",
        audioCacheKey: "cache",
        audioVoiceId: "story-mark",
        audioModelId: expected.modelId,
        audioConfigVersion: expected.configVersion,
        audioDictionaryVersion: expected.dictionaryVersion,
        audioLanguage: "en",
        audioSpeed: speed,
      },
      { voiceId: opened, speed, language: "en" },
      expected
    ),
    "fresh"
  );
  assert.equal(
    savedAudioIdentityStatus(
      {
        audioUrl: "https://example.public.blob.vercel-storage.com/audio/fresh.mp3",
        audioCacheKey: "cache",
        audioVoiceId: "story-mark",
        audioModelId: expected.modelId,
        audioConfigVersion: expected.configVersion,
        audioDictionaryVersion: expected.dictionaryVersion,
        audioLanguage: "en",
        audioSpeed: speed,
      },
      { voiceId: "story-tuntun", speed, language: "en" },
      expected
    ),
    "stale"
  );
});

test("a story with no recording still shows an explicit incompatible query voice", () => {
  assert.equal(
    narratorForOpenStory({
      voices: englishList,
      language: "en",
      savedVoiceId: null,
      queryVoiceId: "story-tuntun",
    }),
    "story-tuntun"
  );
  assert.equal(defaultNarratorId(chineseList, "zh-Hant"), "story-nuan-ready");
});
