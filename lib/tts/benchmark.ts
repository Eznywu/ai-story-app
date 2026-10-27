import { readFileSync } from "node:fs";
import path from "node:path";
import { assertBenchmarkCaseCount, BENCHMARK_CASES, type BenchmarkCase } from "./benchmarkCases";
import { narrationCacheKey } from "./cacheKey";
import { activeTtsConfig, COMPARISON_CONFIG_IDS, settingsActuallySent, TTS_CONFIGS, type VoiceSettingsSent } from "./config";
import { DEFAULT_TTS_MODEL_ID } from "./modelCapabilities";
import { buildNarrationScript } from "./narrationScript";
import { parsePronunciationDictionary, type PronunciationDictionary } from "./pronunciationDictionary";
import { createMockSpeechToText, screenTranscript, type TranscriptScreen } from "./stt";

export type HumanReviewScores = {
  pronunciation: number | null;
  clarity: number | null;
  naturalness: number | null;
  pacing: number | null;
  notes: string;
  status: "pending";
};

export type BenchmarkRow = {
  id: string;
  language: string;
  focus: string;
  displayText: string;
  expectedScript: string;
  appliedEntryIds: string[];
  pendingEntryIds: string[];
  screen: TranscriptScreen;
  audio: {
    label: "mock";
    fixture: string;
    playableLiveSample: false;
  };
  review: HumanReviewScores;
};

export type ComparisonRow = {
  configId: string;
  configVersion: string;
  promotionStatus: string;
  modelId: string;
  voiceSettings: VoiceSettingsSent;
  script: string;
  cacheKey: string;
  previousText?: string;
  nextText?: string;
  audioLabel: "mock";
};

const FIXTURE = "lib/providers/fixtures/mock-narration.mp3";

export function loadCheckedInDictionary(): PronunciationDictionary {
  const file = path.join(process.cwd(), "data/pronunciation/dictionary.json");
  return parsePronunciationDictionary(JSON.parse(readFileSync(file, "utf8")));
}

export function runMockBenchmark(dictionary = loadCheckedInDictionary()): {
  label: "mock";
  sampleSize: number;
  humanListeners: 0;
  humanReviewStatus: "pending";
  pronunciationProven: false;
  matched: number;
  mismatch: number;
  uncertain: number;
  rows: BenchmarkRow[];
  targets: {
    criticalNameErrors: "0 confirmed. Not measured on live audio.";
    omittedInventedOrRepeatedSentences: "0 confirmed. Not measured on live audio.";
    humanScore: "At least 4 out of 5. No listener has scored these clips.";
  };
} {
  assertBenchmarkCaseCount();
  const stt = createMockSpeechToText("echo");
  const rows: BenchmarkRow[] = BENCHMARK_CASES.map((item) => rowForCase(item, dictionary));
  void stt;
  const matched = rows.filter((row) => row.screen.status === "matched").length;
  return {
    label: "mock",
    sampleSize: rows.length,
    humanListeners: 0,
    humanReviewStatus: "pending",
    pronunciationProven: false,
    matched,
    mismatch: rows.filter((row) => row.screen.status === "mismatch").length,
    uncertain: rows.filter((row) => row.screen.status === "uncertain").length,
    rows,
    targets: {
      criticalNameErrors: "0 confirmed. Not measured on live audio.",
      omittedInventedOrRepeatedSentences: "0 confirmed. Not measured on live audio.",
      humanScore: "At least 4 out of 5. No listener has scored these clips.",
    },
  };
}

function rowForCase(item: BenchmarkCase, dictionary: PronunciationDictionary): BenchmarkRow {
  const spoken = buildNarrationScript(item.text, item.language, dictionary);
  const screen = screenTranscript(spoken.script, spoken.script, item.language, "mock");
  return {
    id: item.id,
    language: item.language,
    focus: item.focus,
    displayText: spoken.displayText,
    expectedScript: spoken.script,
    appliedEntryIds: spoken.appliedEntryIds,
    pendingEntryIds: spoken.pendingEntryIds,
    screen,
    audio: { label: "mock", fixture: FIXTURE, playableLiveSample: false },
    review: {
      pronunciation: null,
      clarity: null,
      naturalness: null,
      pacing: null,
      notes: "Pending. Nobody has listened to a live recording of this line.",
      status: "pending",
    },
  };
}

export function buildComparisonPlan(input: {
  text: string;
  language: string;
  voiceId: string;
  dictionary: PronunciationDictionary;
  modelId?: string;
}): ComparisonRow[] {
  const modelId = input.modelId ?? DEFAULT_TTS_MODEL_ID;
  const spoken = buildNarrationScript(input.text, input.language, input.dictionary);
  return COMPARISON_CONFIG_IDS.map((configId) => {
    const config = TTS_CONFIGS[configId];
    const voiceSettings = settingsActuallySent(configId, modelId, input.language);
    return {
      configId,
      configVersion: config.version,
      promotionStatus: config.promotionStatus,
      modelId,
      voiceSettings,
      script: spoken.script,
      cacheKey: narrationCacheKey({
        script: spoken.script,
        voiceId: input.voiceId,
        modelId,
        voiceSettings,
        dictionaryVersion: input.dictionary.version,
        configVersion: config.version,
        language: input.language,
      }),
      audioLabel: "mock",
    };
  });
}

export function activeConfigIsProposed(): boolean {
  return activeTtsConfig().promotionStatus === "proposed";
}
