import { buildWeeklyReport, reviewWeekKey, selectWeeklyReviewSamples, type WeeklyReport } from "./review";

export type WeeklyClip = {
  id: string;
  url?: string | null;
  createdAt?: string;
};

/**
 * Builds the Monday review from clips that already exist.
 * It never calls a voice or speech-to-text provider.
 */
export async function runWeeklyNarrationReview(input: {
  now?: Date;
  loadUnresolved: () => Promise<WeeklyClip[]>;
  loadNewClips: () => Promise<WeeklyClip[]>;
  saveReport?: (report: WeeklyReport) => Promise<void>;
  rng?: () => number;
}): Promise<WeeklyReport> {
  const unresolved = await input.loadUnresolved();
  const newClips = await input.loadNewClips();
  const selection = selectWeeklyReviewSamples({
    unresolved,
    newClips,
    rng: input.rng,
  });
  const report = buildWeeklyReport({
    weekKey: reviewWeekKey(input.now),
    selection,
    newClipCount: newClips.length,
  });
  if (input.saveReport) await input.saveReport(report);
  return report;
}
