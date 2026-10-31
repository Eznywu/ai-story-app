/**
 * One place for the voice settings Happy Horse sends to ElevenLabs.
 * Playback speed (the 0.75x–1.5x player control) is not a field here.
 *
 * Everyday recordings stay on the baseline the app already sent at warmth 40
 * and speed 0.95. Bedtime candidates are for the comparison harness only.
 * A candidate is used for new stories only after resolveOrdinaryNarrationConfig
 * accepts a promotion review. Nothing in this file is marked promoted.
 */

import { getModelCapability, type ModelCapability } from "./modelCapabilities";

export type VoiceSettingsSent = {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
};

export type TtsConfigRole = "current-baseline" | "candidate";
export type TtsPromotionStatus = "baseline" | "proposed" | "promoted";

export type TtsConfig = {
  id: string;
  version: string;
  role: TtsConfigRole;
  promotionStatus: TtsPromotionStatus;
  modelId: string;
  /** Static settings. The legacy baseline fills these from legacyEmotionSettings. */
  voiceSettings: VoiceSettingsSent | null;
  summary: string;
};

export const TTS_CONFIG_VERSION = "2026-10-27.1";

/**
 * English defaults previously sent for warmth 40 and speed 0.95:
 * stability 0.65 - 0.40 * 0.45 = 0.47
 * style 0.15 + 0.40 * 0.80 = 0.47
 * similarity 0.85
 * Chinese used a different formula (stability about 0.612, style 0.24, similarity 0.78).
 */
export function legacyEmotionSettings(language: string, speed = 0.95, emotion = 40): VoiceSettingsSent {
  const isZh = String(language).toLowerCase().startsWith("zh");
  const emotionNum = Number.isFinite(Number(emotion)) ? Number(emotion) : 40;
  const emotion01 = Math.max(0, Math.min(1, emotionNum > 1 ? emotionNum / 100 : emotionNum));
  const stability = isZh ? 0.72 - emotion01 * 0.27 : 0.65 - emotion01 * 0.45;
  const style = isZh ? 0.1 + emotion01 * 0.35 : 0.15 + emotion01 * 0.8;
  const similarityBoost = isZh ? 0.78 : 0.85;
  return {
    stability: roundSetting(stability),
    similarityBoost: roundSetting(similarityBoost),
    style: roundSetting(style),
    useSpeakerBoost: true,
    speed: roundSetting(speed),
  };
}

export const MULTILINGUAL_V2_BEDTIME_CANDIDATE: VoiceSettingsSent = {
  speed: 0.9,
  stability: 0.6,
  similarityBoost: 0.75,
  style: 0,
  useSpeakerBoost: true,
};

export const TTS_CONFIGS: Record<string, TtsConfig> = {
  "legacy-emotion": {
    id: "legacy-emotion",
    version: `${TTS_CONFIG_VERSION}+legacy-emotion`,
    role: "current-baseline",
    promotionStatus: "baseline",
    modelId: "eleven_v3",
    voiceSettings: null,
    summary:
      "Everyday voice until a bedtime preset passes a live benchmark and a human listen. English settings at the old warmth of 40: stability 0.47, similarity 0.85, style 0.47, speaker boost on, speed 0.95. The warmth slider is gone; this is the frozen baseline, not a new performance.",
  },
  "bedtime-v3-a": {
    id: "bedtime-v3-a",
    version: `${TTS_CONFIG_VERSION}+bedtime-v3-a`,
    role: "candidate",
    promotionStatus: "proposed",
    modelId: "eleven_v3",
    voiceSettings: {
      speed: 0.9,
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
      useSpeakerBoost: true,
    },
    summary:
      "Proposed bedtime preset for eleven_v3. Speed 0.90, stability 0.50, similarity 0.75, style 0, speaker boost on. Comparison harness only until a promotion review passes. Not approved, and not used for everyday recordings.",
  },
  "bedtime-v3-b": {
    id: "bedtime-v3-b",
    version: `${TTS_CONFIG_VERSION}+bedtime-v3-b`,
    role: "candidate",
    promotionStatus: "proposed",
    modelId: "eleven_v3",
    voiceSettings: {
      speed: 0.85,
      stability: 0.7,
      similarityBoost: 0.75,
      style: 0,
      useSpeakerBoost: true,
    },
    summary:
      "Slower, steadier comparison preset. Speed 0.85, stability 0.70, similarity 0.75, style 0, speaker boost on. Not proven by a listener.",
  },
};

/** Waiting for a listen. Naming it here does not turn it on. */
export const PROPOSED_TTS_CONFIG_ID = "bedtime-v3-a";

export const COMPARISON_CONFIG_IDS = ["legacy-emotion", "bedtime-v3-a", "bedtime-v3-b"] as const;

/**
 * The switch for an approved preset. requestedConfigId stays null until a
 * person has heard a live sample and the promotion review below would pass.
 * Setting the id alone does nothing: resolveOrdinaryNarrationConfig still
 * keeps the baseline when the review is missing, mock, or incomplete.
 */
export const APPROVED_PRESET_REQUEST: PresetRequest = {
  requestedConfigId: null,
  promotion: null,
};

export type PresetRequest = {
  requestedConfigId: string | null;
  promotion: PromotionInput | null;
};

export function activeTtsConfig(request: PresetRequest = APPROVED_PRESET_REQUEST): TtsConfig {
  return resolveOrdinaryNarrationConfig(request).config;
}

export function activeNarrationSpeed(request: PresetRequest = APPROVED_PRESET_REQUEST): number {
  const config = activeTtsConfig(request);
  return voiceSettingsForConfig(config.id, "en").speed ?? 0.95;
}

export function roundSetting(value: number): number {
  return Math.round(value * 100) / 100;
}

export function voiceSettingsForConfig(configId: string, language: string, speedOverride?: number): VoiceSettingsSent {
  const config = TTS_CONFIGS[configId];
  if (!config) {
    throw new Error(`Unknown narration config ${configId}`);
  }
  const base =
    config.voiceSettings ??
    legacyEmotionSettings(language, 0.95, 40);
  const speed = speedOverride == null ? base.speed : speedOverride;
  return {
    ...base,
    ...(speed == null ? {} : { speed: roundSetting(speed) }),
  };
}

/** Drop controls the selected model is not documented to accept. */
export function voiceSettingsForModel(settings: VoiceSettingsSent, modelId: string): VoiceSettingsSent {
  const capability = getModelCapability(modelId);
  const sent: VoiceSettingsSent = {};
  if (capability.stability && settings.stability != null) sent.stability = roundSetting(settings.stability);
  if (capability.similarityBoost && settings.similarityBoost != null) {
    sent.similarityBoost = roundSetting(settings.similarityBoost);
  }
  if (capability.style && settings.style != null) sent.style = roundSetting(settings.style);
  if (capability.speakerBoost && settings.useSpeakerBoost != null) sent.useSpeakerBoost = settings.useSpeakerBoost;
  if (capability.speed.supported && settings.speed != null) {
    const clamped = Math.min(capability.speed.max, Math.max(capability.speed.min, settings.speed));
    sent.speed = roundSetting(clamped);
  }
  return sent;
}

export function settingsActuallySent(configId: string, modelId: string, language: string, speedOverride?: number): VoiceSettingsSent {
  return voiceSettingsForModel(voiceSettingsForConfig(configId, language, speedOverride), modelId);
}

/**
 * If Multilingual v2 is the selected model, map onto the candidate Eason asked
 * to try. That model is not the one everyday stories use. eleven_v3 uses the
 * config id passed in, or the everyday preset when none is passed.
 */
export function settingsForSelectedModel(
  model: ModelCapability,
  language: string,
  speedOverride?: number,
  configId?: string
): VoiceSettingsSent {
  if (model.modelId === "eleven_multilingual_v2") {
    const speed = speedOverride == null ? MULTILINGUAL_V2_BEDTIME_CANDIDATE.speed : speedOverride;
    return voiceSettingsForModel({ ...MULTILINGUAL_V2_BEDTIME_CANDIDATE, speed }, model.modelId);
  }
  const id = configId ?? resolveOrdinaryNarrationConfig().config.id;
  return settingsActuallySent(id, model.modelId, language, speedOverride);
}

export type PromotionInput = {
  configId: string;
  benchmarkCaseIds: string[];
  requiredCaseIds: string[];
  failedCaseIds: string[];
  previouslyFailingCaseIds: string[];
  resultsAreMock: boolean;
  humanListeningComplete: boolean;
};

export function evaluatePromotion(input: PromotionInput): { promote: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const config = TTS_CONFIGS[input.configId];
  if (!config) reasons.push("That narration config does not exist.");
  if (config?.promotionStatus === "promoted") reasons.push("This config is already marked promoted.");
  if (input.resultsAreMock) {
    reasons.push("Mock audio cannot promote a config. A person has to hear a live recording.");
  }
  if (!input.humanListeningComplete) {
    reasons.push("Human listening is not complete.");
  }
  const ran = new Set(input.benchmarkCaseIds);
  const missingRequired = input.requiredCaseIds.filter((id) => !ran.has(id));
  if (missingRequired.length) {
    reasons.push(`Benchmark is missing: ${missingRequired.join(", ")}.`);
  }
  const missingFailures = input.previouslyFailingCaseIds.filter((id) => !ran.has(id));
  if (missingFailures.length) {
    reasons.push(`Previously failing cases were not re-run: ${missingFailures.join(", ")}.`);
  }
  if (input.failedCaseIds.length) {
    reasons.push(`These cases failed: ${input.failedCaseIds.join(", ")}.`);
  }
  return { promote: reasons.length === 0, reasons };
}

export type OrdinaryNarrationChoice = {
  config: TtsConfig;
  promotionStatus: TtsPromotionStatus;
  reasons: string[];
};

/**
 * Everyday stories use the baseline. A proposed preset is switched on only
 * when this request names it and evaluatePromotion accepts the review.
 * A missing, mock, or incomplete review keeps the baseline.
 */
export function resolveOrdinaryNarrationConfig(request: PresetRequest = APPROVED_PRESET_REQUEST): OrdinaryNarrationChoice {
  const baseline = TTS_CONFIGS["legacy-emotion"];
  const requested = request.requestedConfigId?.trim() || null;
  if (!requested || requested === baseline.id) {
    return {
      config: baseline,
      promotionStatus: "baseline",
      reasons: ["Everyday recordings use the current baseline until a preset passes promotion."],
    };
  }
  const candidate = TTS_CONFIGS[requested];
  if (!candidate) {
    return {
      config: baseline,
      promotionStatus: "baseline",
      reasons: [`Unknown preset ${requested}. Everyday recordings stay on the baseline.`],
    };
  }
  if (!request.promotion || request.promotion.configId !== requested) {
    return {
      config: baseline,
      promotionStatus: "baseline",
      reasons: ["That preset has no promotion review, so everyday recordings stay on the baseline."],
    };
  }
  const decision = evaluatePromotion(request.promotion);
  if (!decision.promote) {
    return { config: baseline, promotionStatus: "baseline", reasons: decision.reasons };
  }
  return { config: candidate, promotionStatus: "promoted", reasons: [] };
}
