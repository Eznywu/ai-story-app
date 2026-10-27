import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { NarrationPlan } from "@/lib/tts/planNarration";
import { shouldFlagBaseline } from "@/lib/tts/review";

export async function recordNarrationAssets(input: {
  storyId?: string;
  plan: NarrationPlan;
  filename?: string | null;
  url?: string | null;
  attempts: number[];
  validityStatus: string;
  validityNotes: string;
  transcriptStatus: string;
  transcriptNotes: string;
  durationMs?: number;
}): Promise<{ baselineFlag: boolean }> {
  const existing = await prisma.narrationAsset.count({
    where: { source: "story", status: "active", sectionIndex: 0 },
  });
  const baselineFlag = shouldFlagBaseline(existing);
  const settings = input.plan.voiceSettings as Prisma.InputJsonValue;
  await prisma.narrationAsset.createMany({
    data: input.plan.sections.map((section) => ({
      storyId: input.storyId,
      sectionIndex: section.index,
      sectionCount: input.plan.sections.length,
      status: "active",
      modelId: input.plan.modelId,
      voiceId: input.plan.voiceId,
      voiceSettings: settings,
      language: input.plan.language,
      dictionaryVersion: input.plan.dictionaryVersion,
      configVersion: input.plan.configVersion,
      configId: input.plan.configId,
      cacheKey: input.plan.cacheKey,
      narrationScript: section.text,
      filename: input.filename,
      url: input.url,
      durationMs: section.index === 0 ? input.durationMs : null,
      validityStatus: input.validityStatus,
      validityNotes: `${input.validityNotes} Transitions to recheck: ${section.transitionChecks.join(", ") || "none"}.`,
      transcriptStatus: input.transcriptStatus,
      transcriptNotes: input.transcriptNotes,
      attempt: input.attempts[section.index] ?? 1,
      baselineFlag: baselineFlag && section.index === 0,
      source: "story",
    })),
  });
  if (baselineFlag) {
    await prisma.narrationReviewItem.create({
      data: {
        source: "baseline",
        status: "pending",
        category: "first-20",
        notes: "One of the first 20 story recordings. A person still needs to listen.",
        payload: {
          cacheKey: input.plan.cacheKey,
          storyId: input.storyId ?? null,
          humanReviewStatus: "pending",
        },
      },
    });
  }
  return { baselineFlag };
}

export async function recordNarrationFailure(input: { storyId?: string; message: string; cacheKey?: string }) {
  await prisma.narrationReviewItem.create({
    data: {
      source: "synthesis-failure",
      status: "pending",
      category: "audio-check",
      notes: input.message,
      payload: {
        storyId: input.storyId ?? null,
        cacheKey: input.cacheKey ?? null,
        keptPreviousAudio: true,
      },
    },
  });
}
