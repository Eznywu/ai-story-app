import { narrationCacheKey } from "./cacheKey";
import { chunkNarrationScript, continuityContext, transitionCheckIndexes, type NarrationChunk } from "./chunking";
import {
  resolveOrdinaryNarrationConfig,
  settingsForSelectedModel,
  TTS_CONFIGS,
  type PresetRequest,
  type VoiceSettingsSent,
} from "./config";
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
  /** Refused unless it is the everyday preset. Comparison uses comparisonConfigId. */
  configId?: string;
  /** Explicit comparison path. Proposed presets are allowed here only. */
  comparisonConfigId?: string;
  /** Defaults to the checked-in switch, which has not approved a candidate. */
  presetRequest?: PresetRequest;
}): NarrationPlan {
  const comparison = input.comparisonConfigId ? TTS_CONFIGS[input.comparisonConfigId] : undefined;
  if (input.comparisonConfigId && !comparison) {
    throw new Error(`Unknown narration config ${input.comparisonConfigId}`);
  }
  const choice = comparison
    ? { config: comparison, promotionStatus: comparison.promotionStatus }
    : resolveOrdinaryNarrationConfig(input.presetRequest);
  if (!comparison && input.configId && input.configId !== choice.config.id) {
    throw new Error("New recordings use the everyday narration preset. Other presets are for the comparison harness only.");
  }
  const modelId = resolveTtsModelId(input.modelId);
  const capability = getModelCapability(modelId);
  const spoken = buildNarrationScript(input.text, input.language, input.dictionary);
  if (!spoken.script.trim()) {
    throw new Error("Add story text before making narration.");
  }
  const voiceSettings = settingsForSelectedModel(capability, input.language, input.speed, choice.config.id);
  const chunks = chunkNarrationScript(spoken.script, maxChunkChars(modelId));
  const sections = chunks.map((chunk) => toSection(modelId, chunks, chunk));
  return {
    displayText: spoken.displayText,
    script: spoken,
    modelId,
    configId: choice.config.id,
    configVersion: choice.config.version,
    promotionStatus: choice.promotionStatus,
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
      configVersion: choice.config.version,
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
