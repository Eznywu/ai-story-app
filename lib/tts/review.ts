export const BASELINE_STORY_AUDIO_COUNT = 20;
export const WEEKLY_SAMPLE_SIZE = 10;

export function shouldFlagBaseline(existingStoryAudioCount: number): boolean {
  return existingStoryAudioCount < BASELINE_STORY_AUDIO_COUNT;
}

export function reviewWeekKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type WeeklySelection<T> = {
  outcome: "review" | "no-new-samples";
  unresolved: T[];
  sample: T[];
  /** The weekly job must never create audio to fill a report. */
  generatedAudio: false;
  note: string;
};

export function selectWeeklyReviewSamples<T>(input: {
  unresolved: T[];
  newClips: T[];
  sampleSize?: number;
  rng?: () => number;
}): WeeklySelection<T> {
  if (input.newClips.length === 0) {
    return {
      outcome: "no-new-samples",
      unresolved: [...input.unresolved],
      sample: [],
      generatedAudio: false,
      note: "no new samples",
    };
  }
  const size = input.sampleSize ?? WEEKLY_SAMPLE_SIZE;
  const sample = input.newClips.length <= size ? [...input.newClips] : pickRandom(input.newClips, size, input.rng ?? Math.random);
  return {
    outcome: "review",
    unresolved: [...input.unresolved],
    sample,
    generatedAudio: false,
    note: `Selected ${sample.length} new clip${sample.length === 1 ? "" : "s"} and ${input.unresolved.length} unresolved flag${input.unresolved.length === 1 ? "" : "s"}.`,
  };
}

function pickRandom<T>(items: T[], count: number, rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export type WeeklyReport = {
  weekKey: string;
  outcome: "review" | "no-new-samples";
  generatedAudio: false;
  humanReviewStatus: "pending";
  sampleCounts: {
    unresolved: number;
    newClips: number;
    sampled: number;
  };
  confirmedErrorsByCategory: Record<string, number>;
  recurringProblemWords: string[];
  humanScores: null;
  retries: { automaticRegenerationCap: number; note: string };
  costs: { liveProviderUsd: 0; note: string };
  changesMade: string[];
  unresolvedIssues: string[];
  recommendations: string[];
  note: string;
};

export function buildWeeklyReport(input: {
  weekKey: string;
  selection: WeeklySelection<unknown>;
  newClipCount: number;
  changesMade?: string[];
}): WeeklyReport {
  const unresolvedCount = input.selection.unresolved.length;
  const recommendations: string[] = [];
  if (input.selection.outcome === "no-new-samples" && unresolvedCount === 0) {
    recommendations.push("No new recordings arrived. Do not create a story just to fill this report.");
  } else {
    recommendations.push("A person still needs to listen. Scores stay empty until that happens.");
  }
  return {
    weekKey: input.weekKey,
    outcome: input.selection.outcome,
    generatedAudio: false,
    humanReviewStatus: "pending",
    sampleCounts: {
      unresolved: unresolvedCount,
      newClips: input.newClipCount,
      sampled: input.selection.sample.length,
    },
    confirmedErrorsByCategory: {},
    recurringProblemWords: [],
    humanScores: null,
    retries: {
      automaticRegenerationCap: 2,
      note: "This report does not include live retry charges. None were made by the weekly job.",
    },
    costs: {
      liveProviderUsd: 0,
      note: "The weekly job does not call ElevenLabs, OpenAI, Gemini, or a speech-to-text service.",
    },
    changesMade: input.changesMade ?? [],
    unresolvedIssues: unresolvedCount ? [`${unresolvedCount} flag${unresolvedCount === 1 ? "" : "s"} still waiting.`] : [],
    recommendations,
    note: input.selection.note,
  };
}

export type ReportedPronunciationError = {
  word: string;
  timestampMs: number;
  language: string;
  clipId?: string;
  notes?: string;
};

export type RegressionCase = {
  id: string;
  word: string;
  timestampMs: number;
  language: string;
  clipId?: string;
  notes: string;
  status: "pending";
  reproduced: false;
  expectedScript: string;
};

export function regressionCaseFromReport(error: ReportedPronunciationError): RegressionCase {
  const word = error.word.trim();
  if (!word) throw new Error("A pronunciation report needs the exact word.");
  if (!Number.isFinite(error.timestampMs) || error.timestampMs < 0) {
    throw new Error("A pronunciation report needs the time in the recording.");
  }
  const slug = word.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/gi, "-").replace(/^-|-$/g, "") || "word";
  return {
    id: `regression-${slug}-${Math.round(error.timestampMs)}`,
    word,
    timestampMs: Math.round(error.timestampMs),
    language: error.language,
    clipId: error.clipId,
    notes: error.notes?.trim() || "Waiting for a live reproduction. No audio was generated from this report.",
    status: "pending",
    reproduced: false,
    expectedScript: "",
  };
}
