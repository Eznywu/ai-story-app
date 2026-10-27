/**
 * What the narration code is allowed to send, by ElevenLabs model.
 *
 * Sources checked 2026-10-27:
 * - https://elevenlabs.io/docs/overview/models
 * - https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
 * - https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching
 * - https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries
 * - https://elevenlabs.io/docs/api-reference/text-to-speech/convert
 *
 * The app's default model is eleven_v3. Product languages stay English and Traditional Chinese.
 */

export type PhonemeSupport = "english-ipa" | "alias-only" | "none";

export type ModelCapability = {
  modelId: string;
  characterLimit: number;
  /** Official approximate duration used only for estimates. */
  approxMinutesPerThousandChars: number;
  speed: { supported: boolean; min: number; max: number };
  stability: boolean;
  similarityBoost: boolean;
  style: boolean;
  speakerBoost: boolean;
  /** ISO language code on the request. Multilingual v2 rejects it. */
  languageCode: boolean;
  /** previous_request_ids / next_request_ids. Officially unavailable on eleven_v3. */
  requestStitching: boolean;
  /**
   * previous_text / next_text. The stitching guide says request stitching is not
   * available for eleven_v3, and this repo already saw unsupported_model when those
   * fields were sent to eleven_v3.
   */
  previousNextText: boolean;
  /** SSML <break> tags. Best practices: not supported on v3 or v4. */
  ssmlBreak: boolean;
  /** Square-bracket audio tags such as [whispers]. Supported, but this app does not send them. */
  audioTags: boolean;
  phonemeDictionary: PhonemeSupport;
  notes: string;
};

const SPEED = { supported: true, min: 0.7, max: 1.2 } as const;

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  eleven_v3: {
    modelId: "eleven_v3",
    characterLimit: 5000,
    approxMinutesPerThousandChars: 1,
    speed: { ...SPEED },
    stability: true,
    similarityBoost: true,
    style: true,
    speakerBoost: true,
    languageCode: false,
    requestStitching: false,
    previousNextText: false,
    ssmlBreak: false,
    audioTags: true,
    phonemeDictionary: "english-ipa",
    notes:
      "Default model. 5,000 character limit, about 5 minutes. Dramatic delivery. Phoneme dictionaries work for English; non-English IPA is documented for v4, so Chinese stays on local alias or the original characters. No request stitching. The installed SDK says language_code returns an error except on Turbo v2.5 and Flash v2.5, while the models page lists codes for v3. This app does not send language_code to v3.",
  },
  eleven_multilingual_v2: {
    modelId: "eleven_multilingual_v2",
    characterLimit: 10000,
    approxMinutesPerThousandChars: 1,
    speed: { ...SPEED },
    stability: true,
    similarityBoost: true,
    style: true,
    speakerBoost: true,
    languageCode: false,
    requestStitching: true,
    previousNextText: true,
    ssmlBreak: true,
    audioTags: false,
    phonemeDictionary: "alias-only",
    notes:
      "Not the model this app sends unless ELEVENLABS_TTS_MODEL is set. Phoneme tags are skipped; use alias text. Language code is not supported. Request stitching is available. Candidate bedtime numbers if this model is selected: speed 0.90, stability 0.60, similarity 0.75, style 0, speaker boost on. Those numbers are a starting point, not a listening result.",
  },
  eleven_flash_v2_5: {
    modelId: "eleven_flash_v2_5",
    characterLimit: 40000,
    approxMinutesPerThousandChars: 1,
    speed: { ...SPEED },
    stability: true,
    similarityBoost: true,
    style: false,
    speakerBoost: false,
    languageCode: true,
    requestStitching: true,
    previousNextText: true,
    ssmlBreak: true,
    audioTags: false,
    phonemeDictionary: "alias-only",
    notes:
      "Not used by Happy Horse. Style and speaker boost are left off the request because Flash is documented as the fast model, and this app has not confirmed those two controls on it. Numbers need our own expansion; Flash does not normalize them the way Multilingual v2 does.",
  },
};

export const DEFAULT_TTS_MODEL_ID = "eleven_v3";

export function resolveTtsModelId(override?: string): string {
  const fromArg = String(override ?? "").trim();
  if (fromArg) return fromArg;
  const fromEnv = String(process.env.ELEVENLABS_TTS_MODEL ?? "").trim();
  return fromEnv || DEFAULT_TTS_MODEL_ID;
}

export function getModelCapability(modelId: string): ModelCapability {
  return (
    MODEL_CAPABILITIES[modelId] ?? {
      ...MODEL_CAPABILITIES.eleven_v3,
      modelId,
      notes: `No capability card for ${modelId}. Using eleven_v3 limits and refusing stitching so an unknown model cannot get fields this app has not checked.`,
      requestStitching: false,
      previousNextText: false,
      languageCode: false,
      ssmlBreak: false,
      audioTags: false,
      phonemeDictionary: "alias-only",
    }
  );
}

export function languageCodeForModel(modelId: string, language: string): string | undefined {
  const capability = getModelCapability(modelId);
  if (!capability.languageCode) return undefined;
  const value = language.toLowerCase();
  if (value.startsWith("zh")) return "zh";
  if (value.startsWith("en")) return "en";
  return undefined;
}

export function maxChunkChars(modelId: string): number {
  const limit = getModelCapability(modelId).characterLimit;
  return Math.max(200, limit - 100);
}
