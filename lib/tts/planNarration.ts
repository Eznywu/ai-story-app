import { narrationCacheKey } from "./cacheKey";
import { chunkNarrationScript, continuityContext, transitionCheckIndexes, type NarrationChunk } from "./chunking";
import { activeTtsConfig, settingsForSelectedModel, type VoiceSettingsSent } from "./config";
import { getModelCapability, languageCodeForModel, maxChunkChars, resolveTtsModelId } from "./modelCapabilities";
import { buildNarrationScript, type NarrationScript } from "./narrationScript";
import type { PronunciationDictionary } from "./pronunciationDictionary";

export type PlannedSection = {
  index: number;
  text: string;
  previousText?: string;
  nextText?: string;
  transitionChecks: number[];
};

export type NarrationPlan = {
  displayText: string;
  script: NarrationScript;
  modelId: string;
  configId: string;
  configVersion: string;
  promotionStatus: string;
  dictionaryVersion: string;
  voiceId: string;
  language: string;
  languageCode?: string;
  voiceSettings: VoiceSettingsSent;
  sections: PlannedSection[];
  cacheKey: string;
};

export function planNarration(input: {
  text: string;
  language: string;
  voiceId: string;
  dictionary: PronunciationDictionary;
  speed?: number;
  modelId?: string;
  configId?: string;
}): NarrationPlan {
  const config = activeTtsConfig();
  const configId = input.configId ?? config.id;
  if (input.configId && input.configId !== config.id) {
    throw new Error("New recordings use the active narration config. Other presets are for the comparison harness only.");
  }
  const modelId = resolveTtsModelId(input.modelId);
  const capability = getModelCapability(modelId);
  const spoken = buildNarrationScript(input.text, input.language, input.dictionary);
  if (!spoken.script.trim()) {
    throw new Error("Add story text before making narration.");
  }
  const voiceSettings = settingsForSelectedModel(capability, input.language, input.speed);
  const chunks = chunkNarrationScript(spoken.script, maxChunkChars(modelId));
  const sections = chunks.map((chunk) => toSection(modelId, chunks, chunk));
  return {
    displayText: spoken.displayText,
    script: spoken,
    modelId,
    configId,
    configVersion: config.version,
    promotionStatus: config.promotionStatus,
    dictionaryVersion: input.dictionary.version,
    voiceId: input.voiceId,
    language: input.language,
    languageCode: languageCodeForModel(modelId, input.language),
    voiceSettings,
    sections,
    cacheKey: narrationCacheKey({
      script: spoken.script,
      voiceId: input.voiceId,
      modelId,
      voiceSettings,
      dictionaryVersion: input.dictionary.version,
      configVersion: config.version,
      language: input.language,
    }),
  };
}

function toSection(modelId: string, chunks: NarrationChunk[], chunk: NarrationChunk): PlannedSection {
  const context = continuityContext(modelId, chunks, chunk.index);
  if (context.previousText && chunk.text.startsWith(context.previousText)) {
    throw new Error("Continuity context must come from the previous section, not from the section being spoken.");
  }
  if (context.nextText && chunk.text.endsWith(context.nextText) && context.nextText === chunk.text) {
    throw new Error("Continuity context must not repeat the section being spoken.");
  }
  return {
    index: chunk.index,
    text: chunk.text,
    ...context,
    transitionChecks: transitionCheckIndexes(chunk.index, chunks.length),
  };
}
