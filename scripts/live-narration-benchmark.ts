import { loadCheckedInDictionary } from "../lib/tts/benchmark";
import { estimateBenchmarkLiveCost } from "../lib/tts/pricing";

/**
 * Opt-in live benchmark. This file is the only narration script allowed to call
 * a paid provider, and it refuses unless both gates below are set.
 * The cloud agent does not run it.
 */
const estimate = estimateBenchmarkLiveCost(loadCheckedInDictionary());
const live = process.env.RUN_LIVE_NARRATION === "1";
const cap = Number(process.env.LIVE_NARRATION_MAX_USD);
const mock = process.env.MOCK_PROVIDERS === "1";

if (mock) {
  console.error("MOCK_PROVIDERS=1 is set. Refusing the live script. Run npm run narration:benchmark instead.");
  process.exit(2);
}

if (!live || !Number.isFinite(cap)) {
  console.log(
    JSON.stringify(
      {
        refused: true,
        calledProvider: false,
        reason: "Set RUN_LIVE_NARRATION=1 and LIVE_NARRATION_MAX_USD to a cap at or above the estimate. Nothing was sent to ElevenLabs or a speech-to-text service.",
        estimate,
      },
      null,
      2
    )
  );
  process.exit(2);
}

if (cap < estimate.totalUsd) {
  console.error(
    JSON.stringify(
      {
        refused: true,
        calledProvider: false,
        reason: `Cap $${cap.toFixed(2)} is below the estimate $${estimate.totalUsd.toFixed(2)}.`,
        estimate,
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.error(
  "The cap would allow a live run, but this script stops here until Eason asks for that run in a controlled environment. No provider was called."
);
process.exit(2);
