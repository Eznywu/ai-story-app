import { concatMp3 } from "./mp3Inspect";

/** Extra attempts after the first failed try. The first try is the one the person asked for. */
export const MAX_AUTOMATIC_REGENERATIONS = 2;

export function usdForCharacters(characters: number, usdPerThousand = 0.08): number {
  if (!Number.isFinite(characters) || characters <= 0) return 0;
  return (characters / 1000) * usdPerThousand;
}

export function retryBudgetUsd(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.NARRATION_RETRY_BUDGET_USD;
  if (raw == null || String(raw).trim() === "") return 1;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 1;
  return value;
}

export function sttBudgetUsd(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.NARRATION_STT_BUDGET_USD;
  if (raw == null || String(raw).trim() === "") return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export type SectionRender = {
  index: number;
  text: string;
  audio?: Buffer;
  attempts: number;
  ok: boolean;
  notes: string;
};

export type RenderSectionsResult = {
  ok: boolean;
  escalated: boolean;
  audio?: Buffer;
  sections: SectionRender[];
  retrySpentUsd: number;
  keptPreviousAudio: boolean;
};

/**
 * Regenerates only the failed section. Stops after two automatic retries or when the
 * next retry would pass the spending cap. Does not return replacement audio when a
 * section is still bad, so the caller can keep the previous recording.
 */
export async function renderSectionsWithRetry(input: {
  sections: { index: number; text: string }[];
  synthesize: (section: { index: number; text: string }, attempt: number) => Promise<Buffer>;
  validate: (audio: Buffer, sectionText: string) => { ok: boolean; notes: string };
  maxRegenerations?: number;
  budgetUsd: number;
  costUsd: (sectionText: string) => number;
  hadPreviousAudio: boolean;
}): Promise<RenderSectionsResult> {
  const maxRegenerations = input.maxRegenerations ?? MAX_AUTOMATIC_REGENERATIONS;
  const rendered: SectionRender[] = [];
  let retrySpentUsd = 0;
  let escalated = false;

  for (const section of input.sections) {
    let attempt = 0;
    let audio: Buffer | undefined;
    let notes = "";
    let ok = false;
    while (attempt < 1 + maxRegenerations) {
      if (attempt > 0) {
        const cost = input.costUsd(section.text);
        if (retrySpentUsd + cost > input.budgetUsd) {
          notes = "Stopped because another automatic retry would pass the spending cap. The previous recording was kept.";
          escalated = true;
          break;
        }
        retrySpentUsd += cost;
      }
      attempt += 1;
      try {
        const next = await input.synthesize(section, attempt);
        const validity = input.validate(next, section.text);
        notes = validity.notes;
        if (validity.ok) {
          audio = next;
          ok = true;
          break;
        }
      } catch (error) {
        notes = error instanceof Error ? error.message : "Narration failed.";
      }
      if (attempt - 1 >= maxRegenerations) {
        escalated = true;
        notes = notes || "This section failed twice after the first try.";
        break;
      }
    }
    rendered.push({ index: section.index, text: section.text, audio, attempts: attempt, ok, notes });
    if (!ok) {
      escalated = true;
      break;
    }
  }

  const allOk = rendered.length === input.sections.length && rendered.every((section) => section.ok && section.audio);
  return {
    ok: allOk,
    escalated: escalated || !allOk,
    audio: allOk ? concatMp3(rendered.map((section) => section.audio as Buffer)) : undefined,
    sections: rendered,
    retrySpentUsd,
    keptPreviousAudio: input.hadPreviousAudio && !allOk,
  };
}
