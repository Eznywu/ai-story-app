import { loadCheckedInDictionary } from "../lib/tts/benchmark";
import { BENCHMARK_CASES } from "../lib/tts/benchmarkCases";
import { COMPARISON_CONFIG_IDS } from "../lib/tts/config";
import { assessLiveRun, runCappedLiveComparison } from "../lib/tts/liveHarness";
import { estimateBenchmarkLiveCost } from "../lib/tts/pricing";

/**
 * Opt-in live comparison across the baseline and two bedtime candidates.
 * Refuses unless RUN_LIVE_NARRATION=1 and LIVE_NARRATION_MAX_USD covers the estimate.
 * Refuses when MOCK_PROVIDERS=1. Speech-to-text is left unchecked: no STT client is called.
 * The cloud agent does not run this with the gates open.
 */
async function main() {
  const dictionary = loadCheckedInDictionary();
  const estimate = estimateBenchmarkLiveCost(dictionary);
  const gate = assessLiveRun(process.env, estimate.totalUsd);
  if (!gate.allow) {
    const payload = { refused: true, calledProvider: false, reason: gate.reason, estimate };
    const line = JSON.stringify(payload, null, 2);
    if (gate.exitCode === 1) console.error(line);
    else console.log(line);
    process.exit(gate.exitCode);
  }

  const { buildElevenSpeechRequest } = await import("../lib/tts/elevenRequest");
  const { resolveNarrationVoice, speakWithElevenRequest } = await import("../lib/tts/eleven");
  const { planNarration } = await import("../lib/tts/planNarration");

  const result = await runCappedLiveComparison({
    cases: BENCHMARK_CASES.map((item) => ({ id: item.id, text: item.text, language: item.language })),
    dictionary,
    configIds: COMPARISON_CONFIG_IDS,
    capUsd: gate.capUsd,
    synthesize: async (job) => {
      const voice = resolveNarrationVoice(job.language.toLowerCase().startsWith("zh") ? "Eason_CN" : "Eason_EN", job.language);
      const plan = planNarration({
        text: job.text,
        language: job.language,
        voiceId: voice.appVoiceId,
        dictionary,
        comparisonConfigId: job.configId,
      });
      for (const section of plan.sections) {
        const request = buildElevenSpeechRequest({
          text: section.text,
          modelId: plan.modelId,
          language: plan.language,
          voiceSettings: plan.voiceSettings,
          previousText: section.previousText,
          nextText: section.nextText,
        });
        await speakWithElevenRequest(voice.elevenVoiceId, request);
      }
    },
  });

  console.log(
    JSON.stringify(
      {
        refused: false,
        ...result,
        estimate,
        note: "Speech-to-text was not called. Unchecked does not mean the words were correct. Bedtime presets are still not promoted.",
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Live narration failed.";
  console.error(
    JSON.stringify(
      {
        refused: false,
        calledProvider: true,
        error: message,
        note: "A live call may have started. Check the provider account before trying again.",
      },
      null,
      2
    )
  );
  process.exit(1);
});
