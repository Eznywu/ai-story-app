import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runMockBenchmark } from "../lib/tts/benchmark";

const report = runMockBenchmark();
const dir = path.join(process.cwd(), "data/narration");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, "mock-benchmark-results.json");
writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      label: report.label,
      sampleSize: report.sampleSize,
      matched: report.matched,
      mismatch: report.mismatch,
      uncertain: report.uncertain,
      humanListeners: report.humanListeners,
      humanReviewStatus: report.humanReviewStatus,
      pronunciationProven: report.pronunciationProven,
      wrote: "data/narration/mock-benchmark-results.json",
      fixture: "lib/providers/fixtures/mock-narration.mp3",
    },
    null,
    2
  )
);
