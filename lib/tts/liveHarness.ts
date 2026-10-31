import { COMPARISON_CONFIG_IDS } from "./config";
import { buildNarrationScript } from "./narrationScript";
import type { PronunciationDictionary } from "./pronunciationDictionary";

export type LiveGate =
  | { allow: false; calledProvider: false; exitCode: 1 | 2; reason: string }
  | { allow: true; capUsd: number };

/**
 * The live comparison runs only with an explicit flag and a cap at or above
 * the estimate. Mock mode is refused so a mock session cannot look like a live bill.
 */
export function assessLiveRun(env: Record<string, string | undefined>, estimateTotalUsd: number): LiveGate {
  if (env.MOCK_PROVIDERS === "1") {
    return {
      allow: false,
      calledProvider: false,
      exitCode: 2,
      reason: "MOCK_PROVIDERS=1 is set. Refusing the live script. Run npm run narration:benchmark instead.",
    };
  }
  const cap = Number(env.LIVE_NARRATION_MAX_USD);
  if (env.RUN_LIVE_NARRATION !== "1" || !Number.isFinite(cap)) {
    return {
      allow: false,
      calledProvider: false,
      exitCode: 2,
      reason:
        "Set RUN_LIVE_NARRATION=1 and LIVE_NARRATION_MAX_USD to a cap at or above the estimate. Nothing was sent to ElevenLabs or a speech-to-text service.",
    };
  }
  if (cap < estimateTotalUsd) {
    return {
      allow: false,
      calledProvider: false,
      exitCode: 1,
      reason: `Cap $${cap.toFixed(2)} is below the estimate $${estimateTotalUsd.toFixed(2)}.`,
    };
  }
  return { allow: true, capUsd: cap };
}

export type LiveComparisonJob = {
  configId: string;
  text: string;
  language: string;
  script: string;
};

export type LiveComparisonCase = {
  id: string;
  text: string;
  language: string;
};

/**
 * Speaks each case with each config, stopping before the next call would pass the cap.
 * The caller supplies synthesize. This file does not import ElevenLabs.
 * Speech-to-text is not called here; a matching or missing transcript is not claimed.
 */
export async function runCappedLiveComparison(input: {
  cases: LiveComparisonCase[];
  dictionary: PronunciationDictionary;
  configIds?: readonly string[];
  capUsd: number;
  usdPerThousand?: number;
  synthesize: (job: LiveComparisonJob) => Promise<void>;
}): Promise<{
  calledProvider: boolean;
  completed: number;
  stoppedEarly: boolean;
  spentUsd: number;
  stt: "unchecked";
}> {
  const configIds = input.configIds ?? COMPARISON_CONFIG_IDS;
  const usdPerThousand = input.usdPerThousand ?? 0.08;
  let spent = 0;
  let completed = 0;
  for (const item of input.cases) {
    const script = buildNarrationScript(item.text, item.language, input.dictionary).script;
    for (const configId of configIds) {
      const cost = (script.length / 1000) * usdPerThousand;
      if (spent + cost > input.capUsd) {
        return {
          calledProvider: completed > 0,
          completed,
          stoppedEarly: true,
          spentUsd: roundCents(spent),
          stt: "unchecked",
        };
      }
      await input.synthesize({ configId, text: item.text, language: item.language, script });
      spent += cost;
      completed += 1;
    }
  }
  return {
    calledProvider: completed > 0,
    completed,
    stoppedEarly: false,
    spentUsd: roundCents(spent),
    stt: "unchecked",
  };
}

function roundCents(value: number): number {
  return Math.round(value * 10000) / 10000;
}
