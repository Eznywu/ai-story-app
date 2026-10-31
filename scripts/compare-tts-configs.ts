import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildComparisonPlan, loadCheckedInDictionary } from "../lib/tts/benchmark";

const dictionary = loadCheckedInDictionary();
const text = "Bramble counted 3 slow breaths, then said goodnight to Xylophina.";
const rows = buildComparisonPlan({
  text,
  language: "en",
  voiceId: "Eason_EN",
  dictionary,
});
const output = {
  label: "mock",
  note: "No audio was requested from ElevenLabs. The shared mock file is not a recording of this sentence.",
  fixture: "lib/providers/fixtures/mock-narration.mp3",
  text,
  rows,
};
const dir = path.join(process.cwd(), "data/narration");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "mock-comparison.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ label: "mock", configs: rows.map((row) => row.configId), wrote: "data/narration/mock-comparison.json" }, null, 2));
