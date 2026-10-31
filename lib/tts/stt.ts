export type TranscriptLabel = "mock" | "live" | "unchecked" | "skipped_budget" | "uncertain";

export type SttRequest = {
  audio: Buffer;
  language: string;
  /** Used by the mock only. A live provider must ignore this. */
  expectedScript?: string;
};

export type SttResult = {
  text: string;
  label: TranscriptLabel;
  providerId: string;
};

export type SpeechToTextProvider = {
  id: string;
  transcribe(input: SttRequest): Promise<SttResult>;
};

export type MockSttMode = "echo" | "empty" | "drop-first" | "repeat-first";

export function createMockSpeechToText(mode: MockSttMode = "echo"): SpeechToTextProvider {
  return {
    id: `mock:${mode}`,
    async transcribe(input) {
      const expected = String(input.expectedScript ?? "");
      if (mode === "empty") return { text: "", label: "mock", providerId: "mock:empty" };
      if (mode === "drop-first") {
        const tokens = tokenize(expected, input.language);
        return { text: tokens.slice(1).join(" "), label: "mock", providerId: "mock:drop-first" };
      }
      if (mode === "repeat-first") {
        const tokens = tokenize(expected, input.language);
        if (!tokens.length) return { text: "", label: "mock", providerId: "mock:repeat-first" };
        return { text: [tokens[0], tokens[0], ...tokens.slice(1)].join(" "), label: "mock", providerId: "mock:repeat-first" };
      }
      return { text: expected, label: "mock", providerId: "mock:echo" };
    },
  };
}

export type ScreenStatus = "matched" | "mismatch" | "uncertain";

export type TranscriptScreen = {
  status: ScreenStatus;
  missing: string[];
  added: string[];
  substituted: { expected: string; actual: string }[];
  repeated: string[];
  /** A matching transcript does not prove the pronunciation was right. */
  pronunciationProven: false;
  label: TranscriptLabel;
};

export function screenTranscript(expected: string, actual: string, language: string, label: TranscriptLabel): TranscriptScreen {
  const base = {
    pronunciationProven: false as const,
    label,
    missing: [] as string[],
    added: [] as string[],
    substituted: [] as { expected: string; actual: string }[],
    repeated: [] as string[],
  };
  if (label === "unchecked" || label === "skipped_budget") {
    return { ...base, status: "uncertain" };
  }
  if (!actual.trim()) {
    return { ...base, status: "uncertain", missing: tokenize(expected, language) };
  }
  const left = tokenize(expected, language);
  const right = tokenize(actual, language);
  const diff = alignTokens(left, right);
  const status = diff.missing.length || diff.added.length || diff.substituted.length || diff.repeated.length ? "mismatch" : "matched";
  return { ...base, ...diff, status };
}

export function transcriptQueueDecision(input: { mock: boolean; budgetUsd: number; estimatedUsd: number }): {
  status: "mock" | "skipped_budget" | "unchecked";
  note: string;
} {
  if (input.mock) {
    return {
      status: "mock",
      note: "Mock transcript only. A matching mock transcript does not prove pronunciation.",
    };
  }
  if (input.budgetUsd <= 0 || input.estimatedUsd > input.budgetUsd) {
    return {
      status: "skipped_budget",
      note: "Transcript comparison was not run because it is outside the speech-to-text budget.",
    };
  }
  return {
    status: "unchecked",
    note: "The budget would allow a transcript check, but no live speech-to-text provider is connected. Left unchecked.",
  };
}

export function tokenize(text: string, language: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[.,!?;:'"“”‘’。！？，、；：…—\-()[\]<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  if (language.toLowerCase().startsWith("zh")) {
    const tokens: string[] = [];
    const pattern = /[a-z0-9]+|[\u3400-\u9fff]/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(cleaned))) tokens.push(match[0].toLowerCase());
    return tokens;
  }
  return cleaned.split(" ").filter(Boolean);
}

function alignTokens(expected: string[], actual: string[]) {
  const n = expected.length;
  const m = actual.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = expected[i] === actual[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const missing: string[] = [];
  const added: string[] = [];
  const substituted: { expected: string; actual: string }[] = [];
  const repeated: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (expected[i] === actual[j]) {
      i += 1;
      j += 1;
      continue;
    }
    const del = dp[i + 1][j];
    const ins = dp[i][j + 1];
    if (del === ins && dp[i + 1]?.[j + 1] === del) {
      substituted.push({ expected: expected[i], actual: actual[j] });
      i += 1;
      j += 1;
      continue;
    }
    if (del >= ins) {
      missing.push(expected[i]);
      i += 1;
      continue;
    }
    if (j > 0 && actual[j] === actual[j - 1]) repeated.push(actual[j]);
    else added.push(actual[j]);
    j += 1;
  }
  while (i < n) missing.push(expected[i++]);
  while (j < m) {
    if (j > 0 && actual[j] === actual[j - 1]) repeated.push(actual[j]);
    else added.push(actual[j]);
    j += 1;
  }
  return { missing, added, substituted, repeated };
}
