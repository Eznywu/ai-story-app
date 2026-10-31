import type { VoiceSettingsSent } from "./config";
import { voiceSettingsForModel } from "./config";
import { getModelCapability, languageCodeForModel } from "./modelCapabilities";

export type ElevenSpeechRequest = {
  text: string;
  modelId: string;
  voiceSettings: VoiceSettingsSent;
  outputFormat: "mp3_44100_128";
  languageCode?: string;
  previousText?: string;
  nextText?: string;
};

export function buildElevenSpeechRequest(input: {
  text: string;
  modelId: string;
  language: string;
  voiceSettings: VoiceSettingsSent;
  previousText?: string;
  nextText?: string;
}): ElevenSpeechRequest {
  const capability = getModelCapability(input.modelId);
  const request: ElevenSpeechRequest = {
    text: input.text,
    modelId: input.modelId,
    voiceSettings: voiceSettingsForModel(input.voiceSettings, input.modelId),
    outputFormat: "mp3_44100_128",
  };
  const languageCode = languageCodeForModel(input.modelId, input.language);
  if (languageCode) request.languageCode = languageCode;
  if (capability.previousNextText) {
    // Reject context that is just a slice of the words being spoken. That was the old stitching bug.
    if (input.previousText && !input.text.startsWith(input.previousText)) {
      request.previousText = input.previousText;
    }
    if (input.nextText && !input.text.endsWith(input.nextText)) {
      request.nextText = input.nextText;
    }
  }
  return request;
}
