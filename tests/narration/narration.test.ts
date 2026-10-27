import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { savedAudioIdentityStatus } from "../../lib/tts/audioIdentity";
import { checkNarrationAudio } from "../../lib/tts/audioValidity";
import { runMockBenchmark, buildComparisonPlan, loadCheckedInDictionary } from "../../lib/tts/benchmark";
import { BENCHMARK_CASES } from "../../lib/tts/benchmarkCases";
import { narrationCacheKey } from "../../lib/tts/cacheKey";
import { chunkNarrationScript, continuityContext, transitionCheckIndexes } from "../../lib/tts/chunking";
import {
  activeTtsConfig,
  evaluatePromotion,
  legacyEmotionSettings,
  settingsActuallySent,
  settingsForSelectedModel,
  TTS_CONFIGS,
} from "../../lib/tts/config";
import { buildElevenSpeechRequest } from "../../lib/tts/elevenRequest";
import { getModelCapability, maxChunkChars } from "../../lib/tts/modelCapabilities";
import { concatMp3, inspectMp3 } from "../../lib/tts/mp3Inspect";
import { buildNarrationScript, legacyPunctuationSpacing } from "../../lib/tts/narrationScript";
import { parsePronunciationDictionary } from "../../lib/tts/pronunciationDictionary";
import { estimateBenchmarkLiveCost } from "../../lib/tts/pricing";
import { MAX_AUTOMATIC_REGENERATIONS, renderSectionsWithRetry } from "../../lib/tts/retry";
import {
  buildWeeklyReport,
  regressionCaseFromReport,
  reviewWeekKey,
  selectWeeklyReviewSamples,
  shouldFlagBaseline,
} from "../../lib/tts/review";
import { createMockSpeechToText, screenTranscript } from "../../lib/tts/stt";
import { PLAYBACK_RATES } from "../../lib/tts/ttsLimits";

const dictionary = loadCheckedInDictionary();
const fixture = readFileSync("lib/providers/fixtures/mock-narration.mp3");

test("active preset is proposed bedtime settings, not the old warmth formula", () => {
  const active = activeTtsConfig();
  assert.equal(active.id, "bedtime-v3-a");
  assert.equal(active.promotionStatus, "proposed");
  assert.equal(active.modelId, "eleven_v3");
  assert.deepEqual(active.voiceSettings, {
    speed: 0.9,
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true,
  });
  const legacy = legacyEmotionSettings("en", 0.95, 40);
  assert.equal(legacy.style, 0.47);
  assert.equal(legacy.stability, 0.47);
  assert.equal(legacy.similarityBoost, 0.85);
  assert.notEqual(legacy.style, active.voiceSettings?.style);
  assert.equal(TTS_CONFIGS["legacy-emotion"].role, "current-baseline");
  assert.equal(Object.values(TTS_CONFIGS).filter((config) => config.role === "candidate").length, 2);
  assert.equal(Object.values(TTS_CONFIGS).some((config) => config.promotionStatus === "promoted"), false);
});

test("player speeds are not written into the synthesis request", () => {
  const request = buildElevenSpeechRequest({
    text: "Goodnight.",
    modelId: "eleven_v3",
    language: "en",
    voiceSettings: settingsActuallySent("bedtime-v3-a", "eleven_v3", "en"),
  });
  assert.equal("playbackRate" in request, false);
  assert.equal(request.voiceSettings.speed, 0.9);
  assert.equal(PLAYBACK_RATES.includes(0.9 as (typeof PLAYBACK_RATES)[number]), false);
  assert.equal(request.previousText, undefined);
  assert.equal(request.nextText, undefined);
  assert.equal(request.languageCode, undefined);
});

test("eleven_v3 does not get stitching context, and multilingual v2 does not get a slice of itself", () => {
  const chunks = chunkNarrationScript("The fox walked home.\n\nThe moon stayed up.", 20);
  assert.ok(chunks.length >= 2);
  assert.deepEqual(continuityContext("eleven_v3", chunks, 1), {});
  const stitched = continuityContext("eleven_multilingual_v2", chunks, 1);
  assert.equal(stitched.previousText, chunks[0].text.slice(-300));
  assert.notEqual(stitched.previousText, chunks[1].text.slice(0, 120));
  const request = buildElevenSpeechRequest({
    text: chunks[1].text,
    modelId: "eleven_multilingual_v2",
    language: "en",
    voiceSettings: settingsForSelectedModel(getModelCapability("eleven_multilingual_v2"), "en"),
    previousText: chunks[1].text.slice(0, 120),
    nextText: chunks[1].text.slice(-120),
  });
  assert.equal(request.previousText, undefined);
  assert.equal(request.nextText, undefined);
  assert.equal(request.languageCode, undefined);
  assert.equal(request.voiceSettings.speed, 0.9);
  assert.equal(request.voiceSettings.stability, 0.6);
  assert.equal(request.voiceSettings.style, 0);
});

test("flash requests omit style and speaker boost", () => {
  const sent = settingsActuallySent("bedtime-v3-a", "eleven_flash_v2_5", "en", 2);
  assert.equal(sent.style, undefined);
  assert.equal(sent.useSpeakerBoost, undefined);
  assert.equal(sent.speed, 1.2);
});

test("dictionary applies approved aliases only and leaves pending names alone", () => {
  const parsed = parsePronunciationDictionary(JSON.parse(readFileSync("data/pronunciation/dictionary.json", "utf8")));
  assert.equal(parsed.version, "2026-10-27.1");
  for (const entry of parsed.entries) {
    if (entry.reviewStatus !== "approved" || entry.method !== "narration-alias") {
      assert.equal(entry.apply, false);
    }
  }
  assert.throws(() =>
    parsePronunciationDictionary({
      version: "x",
      entries: [
        {
          id: "guess",
          term: "Eason",
          language: "en",
          intendedPronunciation: "EE-sun",
          alias: "EE-sun",
          example: "Eason waved.",
          reviewStatus: "pending",
          method: "narration-alias",
          apply: true,
          notes: "This would be a guess.",
        },
      ],
    })
  );
  const spoken = buildNarrationScript("Eason met Xylophina and Dr. Bramble.", "en", dictionary);
  assert.equal(spoken.displayText, "Eason met Xylophina and Dr. Bramble.");
  assert.match(spoken.script, /Eason/);
  assert.doesNotMatch(spoken.script, /Xylophina/);
  assert.match(spoken.script, /Zye-loff-ee-nah/);
  assert.match(spoken.script, /Doctor Bramble/);
  assert.ok(spoken.pendingEntryIds.includes("eason"));
  const rejected = parsePronunciationDictionary({
    version: "test",
    entries: [
      {
        id: "nope",
        term: "Bramble",
        language: "en",
        intendedPronunciation: "nope",
        alias: "Nope",
        example: "Bramble sat.",
        reviewStatus: "rejected",
        method: "narration-alias",
        apply: false,
        notes: "",
      },
    ],
  });
  assert.equal(buildNarrationScript("Bramble sat.", "en", rejected).script, "Bramble sat.");
});

test("numbers, dates, abbreviations and Chinese speech are expanded without splitting decimals", () => {
  assert.equal(legacyPunctuationSpacing("The mug said 3.14 in the U.S.A. today."), "The mug said 3. 14 in the U. S. A. today.");
  const english = buildNarrationScript(
    "On October 27, 2026, Dr. Bramble saw 3 blankets and a mug marked 3.14 beside the U.S.A. postcard.",
    "en",
    dictionary
  );
  assert.match(english.script, /October twenty-seventh, twenty twenty-six/);
  assert.match(english.script, /three blankets/);
  assert.match(english.script, /three point one four/);
  assert.match(english.script, /U S A/);
  assert.doesNotMatch(english.script, /3\. 14/);
  assert.doesNotMatch(english.script, /\[whisper/i);
  assert.doesNotMatch(english.script, /<break/i);
  const chinese = buildNarrationScript("2026年10月27日，有 3 顆小石子，杯子上寫著 3.14。他把 TV 關掉，再說晚安。單舟在旁邊。", "zh-Hant", dictionary);
  assert.equal(chinese.displayText.includes("2026年10月27日"), true);
  assert.match(chinese.script, /二零二六年十月二十七日/);
  assert.match(chinese.script, /三顆|三 顆/);
  assert.match(chinese.script, /三點一四/);
  assert.match(chinese.script, /television/);
  assert.match(chinese.script, /晚安/);
  assert.match(chinese.script, /單舟/);
  assert.equal(buildNarrationScript("快樂的樂和音樂的樂。", "zh-Hant", dictionary).script, "快樂的樂和音樂的樂。");
});

test("chunks stay on sentence boundaries and under the model limit", () => {
  const limit = 80;
  const text = "Bramble walked past the quiet trees and counted one slow breath. The moon waited at the gate and did not rush him home.";
  const chunks = chunkNarrationScript(text, limit);
  assert.ok(chunks.length >= 2);
  for (const chunk of chunks) {
    assert.ok(chunk.text.length <= limit);
    assert.equal(chunk.text.includes("breath. The"), false);
  }
  assert.equal(chunks.map((chunk) => chunk.text).join(" "), text);
  const long = "word ".repeat(1200);
  assert.throws(() => chunkNarrationScript(long, maxChunkChars("eleven_v3")));
  const novel = "Bramble took one quiet step and looked at the moon. ".repeat(120);
  const parts = chunkNarrationScript(novel, maxChunkChars("eleven_v3"));
  assert.ok(novel.length > 5000);
  assert.ok(parts.length >= 2);
  assert.ok(parts.every((part) => part.text.length <= 5000));
  assert.deepEqual(continuityContext("eleven_v3", parts, 1), {});
  assert.deepEqual(transitionCheckIndexes(1, 3), [0, 1, 2]);
  assert.deepEqual(transitionCheckIndexes(0, 2), [0, 1]);
});

test("cache key changes when the script, voice, model, settings or dictionary changes", () => {
  const base = {
    script: "Goodnight Bramble.",
    voiceId: "Eason_EN",
    modelId: "eleven_v3",
    voiceSettings: settingsActuallySent("bedtime-v3-a", "eleven_v3", "en"),
    dictionaryVersion: "2026-10-27.1",
    configVersion: "config-a",
    language: "en",
  };
  const key = narrationCacheKey(base);
  assert.equal(narrationCacheKey(base), key);
  assert.notEqual(narrationCacheKey({ ...base, script: "Goodnight moon." }), key);
  assert.notEqual(narrationCacheKey({ ...base, voiceId: "Eason_CN" }), key);
  assert.notEqual(narrationCacheKey({ ...base, modelId: "eleven_multilingual_v2" }), key);
  assert.notEqual(narrationCacheKey({ ...base, voiceSettings: { ...base.voiceSettings, speed: 0.85 } }), key);
  assert.notEqual(narrationCacheKey({ ...base, dictionaryVersion: "2026-10-28.1" }), key);
  assert.notEqual(narrationCacheKey({ ...base, configVersion: "config-b" }), key);
});

test("saved audio without a matching identity is stale, and a match can be reused", () => {
  const expected = {
    configVersion: activeTtsConfig().version,
    dictionaryVersion: dictionary.version,
    modelId: "eleven_v3",
  };
  assert.equal(savedAudioIdentityStatus(null, { voiceId: "Eason_EN", speed: 0.9, language: "en" }, expected), "missing");
  assert.equal(
    savedAudioIdentityStatus(
      { audioUrl: "/api/audio/old.mp3", audioCacheKey: null },
      { voiceId: "Eason_EN", speed: 0.9, language: "en" },
      expected
    ),
    "stale"
  );
  assert.equal(
    savedAudioIdentityStatus(
      {
        audioUrl: "/api/audio/new.mp3",
        audioCacheKey: "abc",
        audioVoiceId: "Eason_EN",
        audioModelId: "eleven_v3",
        audioConfigVersion: expected.configVersion,
        audioDictionaryVersion: expected.dictionaryVersion,
        audioLanguage: "en",
        audioSpeed: 0.9,
      },
      { voiceId: "Eason_EN", speed: 0.9, language: "en" },
      expected
    ),
    "fresh"
  );
  assert.equal(
    savedAudioIdentityStatus(
      {
        audioUrl: "/api/audio/new.mp3",
        audioCacheKey: "abc",
        audioVoiceId: "Eason_EN",
        audioModelId: "eleven_v3",
        audioConfigVersion: expected.configVersion,
        audioDictionaryVersion: expected.dictionaryVersion,
        audioLanguage: "en",
        audioSpeed: 0.9,
      },
      { voiceId: "Eason_CN", speed: 0.9, language: "en" },
      expected
    ),
    "stale"
  );
});

test("mp3 checks catch a truncated file and skip duration on the mock fixture", () => {
  const whole = inspectMp3(fixture);
  assert.equal(whole.valid, true);
  assert.equal(whole.truncated, false);
  assert.ok(whole.durationMs > 0);
  const cut = inspectMp3(fixture.subarray(0, Math.floor(fixture.length / 2)));
  assert.equal(cut.truncated, true);
  assert.equal(cut.valid, false);
  const joined = concatMp3([fixture, fixture]);
  const joinedInfo = inspectMp3(joined);
  assert.equal(joinedInfo.valid, true);
  assert.ok(joinedInfo.durationMs > whole.durationMs);
  const mockCheck = checkNarrationAudio({
    audio: fixture,
    script: "This script is much longer than the tiny mock recording and would fail a live duration check.",
    language: "en",
    speed: 0.9,
    mock: true,
  });
  assert.equal(mockCheck.ok, true);
  assert.equal(mockCheck.durationCheck, "skipped_mock");
  const liveCheck = checkNarrationAudio({
    audio: fixture,
    script: "word ".repeat(400),
    language: "en",
    speed: 0.9,
    mock: false,
  });
  assert.equal(liveCheck.ok, false);
  assert.equal(liveCheck.truncated, true);
});

test("a failed section is retried at most twice and a bad take does not replace working audio", async () => {
  assert.equal(MAX_AUTOMATIC_REGENERATIONS, 2);
  const calls: number[] = [];
  const failed = await renderSectionsWithRetry({
    sections: [
      { index: 0, text: "One." },
      { index: 1, text: "Two." },
    ],
    hadPreviousAudio: true,
    budgetUsd: 5,
    costUsd: () => 0.01,
    synthesize: async (section, attempt) => {
      calls.push(section.index * 10 + attempt);
      if (section.index === 1) return Buffer.from("not-audio");
      return fixture;
    },
    validate: (audio) => ({ ok: inspectMp3(audio).valid, notes: inspectMp3(audio).notes }),
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.audio, undefined);
  assert.equal(failed.keptPreviousAudio, true);
  assert.equal(failed.sections[1].attempts, 3);
  assert.deepEqual(calls, [1, 11, 12, 13]);

  const capped = await renderSectionsWithRetry({
    sections: [{ index: 0, text: "One." }],
    hadPreviousAudio: true,
    budgetUsd: 0,
    costUsd: () => 0.05,
    synthesize: async () => Buffer.from("not-audio"),
    validate: () => ({ ok: false, notes: "bad" }),
  });
  assert.equal(capped.sections[0].attempts, 1);
  assert.equal(capped.escalated, true);
  assert.equal(capped.keptPreviousAudio, true);
});

test("weekly review takes unresolved flags plus at most 10 new clips and never invents audio", () => {
  const empty = selectWeeklyReviewSamples({
    unresolved: [{ id: "flag-1" }],
    newClips: [],
  });
  assert.equal(empty.outcome, "no-new-samples");
  assert.equal(empty.note, "no new samples");
  assert.equal(empty.sample.length, 0);
  assert.equal(empty.generatedAudio, false);
  assert.equal(empty.unresolved.length, 1);
  const few = selectWeeklyReviewSamples({
    unresolved: [],
    newClips: [{ id: "a" }, { id: "b" }],
  });
  assert.equal(few.sample.length, 2);
  const many = selectWeeklyReviewSamples({
    unresolved: [{ id: "old" }],
    newClips: Array.from({ length: 12 }, (_item, index) => ({ id: `clip-${index}` })),
    rng: () => 0.1,
  });
  assert.equal(many.sample.length, 10);
  assert.equal(new Set(many.sample.map((clip) => clip.id)).size, 10);
  const report = buildWeeklyReport({ weekKey: reviewWeekKey(new Date("2026-10-26T02:00:00.000Z")), selection: empty, newClipCount: 0 });
  assert.equal(report.humanReviewStatus, "pending");
  assert.equal(report.humanScores, null);
  assert.equal(report.costs.liveProviderUsd, 0);
  assert.equal(report.generatedAudio, false);
  assert.equal(report.weekKey, "2026-10-26");
  assert.equal(shouldFlagBaseline(19), true);
  assert.equal(shouldFlagBaseline(20), false);
});

test("a reported pronunciation error becomes a pending regression case", () => {
  const regression = regressionCaseFromReport({
    word: "青石灣",
    timestampMs: 12500,
    language: "zh-Hant",
    notes: "Heard the wrong tone.",
  });
  assert.equal(regression.word, "青石灣");
  assert.equal(regression.timestampMs, 12500);
  assert.equal(regression.status, "pending");
  assert.equal(regression.reproduced, false);
  assert.throws(() => regressionCaseFromReport({ word: " ", timestampMs: 1, language: "en" }));
});

test("mock benchmark has 20 pending rows and a mock transcript is not pronunciation proof", async () => {
  assert.equal(BENCHMARK_CASES.length, 20);
  assert.deepEqual(
    [...new Set(BENCHMARK_CASES.map((item) => item.language))].sort(),
    ["en", "zh-Hant"]
  );
  const report = runMockBenchmark(dictionary);
  assert.equal(report.label, "mock");
  assert.equal(report.sampleSize, 20);
  assert.equal(report.humanListeners, 0);
  assert.equal(report.humanReviewStatus, "pending");
  assert.equal(report.pronunciationProven, false);
  assert.equal(report.matched, 20);
  for (const row of report.rows) {
    assert.equal(row.displayText, BENCHMARK_CASES.find((item) => item.id === row.id)?.text);
    assert.equal(row.review.status, "pending");
    assert.equal(row.review.pronunciation, null);
    assert.equal(row.screen.pronunciationProven, false);
    assert.equal(row.audio.playableLiveSample, false);
  }
  const dropped = await createMockSpeechToText("drop-first").transcribe({
    audio: fixture,
    language: "en",
    expectedScript: "Bramble counted three breaths",
  });
  const screen = screenTranscript("Bramble counted three breaths", dropped.text, "en", "mock");
  assert.equal(screen.status, "mismatch");
  assert.deepEqual(screen.missing, ["bramble"]);
  const promotion = evaluatePromotion({
    configId: "bedtime-v3-a",
    benchmarkCaseIds: BENCHMARK_CASES.map((item) => item.id),
    requiredCaseIds: BENCHMARK_CASES.map((item) => item.id),
    failedCaseIds: [],
    previouslyFailingCaseIds: [],
    resultsAreMock: true,
    humanListeningComplete: false,
  });
  assert.equal(promotion.promote, false);
  assert.ok(promotion.reasons.some((reason) => reason.toLowerCase().includes("mock")));
});

test("comparison harness renders the same script with the current preset and two candidates", () => {
  const rows = buildComparisonPlan({
    text: "Bramble counted 3 breaths.",
    language: "en",
    voiceId: "Eason_EN",
    dictionary,
  });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.configId), ["legacy-emotion", "bedtime-v3-a", "bedtime-v3-b"]);
  assert.equal(new Set(rows.map((row) => row.script)).size, 1);
  assert.match(rows[0].script, /three breaths/);
  assert.equal(rows[0].voiceSettings.style, 0.47);
  assert.equal(rows[1].voiceSettings.style, 0);
  assert.equal(rows[2].voiceSettings.speed, 0.85);
  assert.equal(new Set(rows.map((row) => row.cacheKey)).size, 3);
  assert.equal(rows.every((row) => row.audioLabel === "mock"), true);
});

test("live cost estimate is labeled and the weekly route does not call a voice provider", () => {
  const estimate = estimateBenchmarkLiveCost(dictionary);
  assert.equal(estimate.label, "estimate");
  assert.equal(estimate.cases, 20);
  assert.equal(estimate.configs, 3);
  assert.ok(estimate.totalCharacters > 0);
  assert.ok(estimate.totalUsd > 0);
  assert.ok(estimate.suggestedCapUsd >= estimate.totalUsd);
  const route = readFileSync("app/api/cron/narration-review/route.ts", "utf8");
  assert.equal(route.includes("narrateWithEleven"), false);
  assert.equal(route.includes("speakWithEleven"), false);
  assert.match(readFileSync("vercel.json", "utf8"), /"schedule": "0 2 \* \* 1"/);
});
