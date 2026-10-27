import { createHash } from "node:crypto";
import type { VoiceSettingsSent } from "./config";

export function canonicalizeSettings(settings: VoiceSettingsSent): string {
  const entries = Object.entries(settings)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(Object.fromEntries(entries));
}

export type CacheKeyInput = {
  script: string;
  voiceId: string;
  modelId: string;
  voiceSettings: VoiceSettingsSent;
  dictionaryVersion: string;
  configVersion: string;
  language: string;
};

/** Identity of a recording. A change to any of these must not reuse an older file. */
export function narrationCacheKey(input: CacheKeyInput): string {
  const payload = [
    input.script,
    input.voiceId,
    input.modelId,
    canonicalizeSettings(input.voiceSettings),
    input.dictionaryVersion,
    input.configVersion,
    input.language,
  ].join("\n");
  return createHash("sha256").update(payload).digest("hex");
}
