import { readFileSync } from "node:fs";
import { runWeeklyNarrationReview, type WeeklyClip } from "../lib/tts/weeklyJob";

function loadFixture(file: string): { unresolved: WeeklyClip[]; newClips: WeeklyClip[] } {
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { unresolved?: WeeklyClip[]; newClips?: WeeklyClip[] };
  return {
    unresolved: parsed.unresolved ?? [],
    newClips: parsed.newClips ?? [],
  };
}

const fixtureArg = process.argv.find((arg) => arg.startsWith("--fixture="));
const fixture = fixtureArg ? loadFixture(fixtureArg.slice("--fixture=".length)) : { unresolved: [], newClips: [] };

runWeeklyNarrationReview({
  loadUnresolved: async () => fixture.unresolved,
  loadNewClips: async () => fixture.newClips,
})
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.generatedAudio !== false) {
      throw new Error("The weekly review must not generate audio.");
    }
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
