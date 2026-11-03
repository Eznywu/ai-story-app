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
  /** Set for a personal voice. Omitted for shared defaults so older saved audio still matches. */
  ownerId?: string | null;
  /** Included for personal voices. Version 1 defaults stay on the historical key. */
  voiceVersion?: number | null;
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
  ];
  if (input.ownerId) {
    payload.push(`owner:${input.ownerId}`, `voiceVersion:${input.voiceVersion ?? 1}`);
  } else if (input.voiceVersion != null && input.voiceVersion !== 1) {
    payload.push(`voiceVersion:${input.voiceVersion}`);
  }
  return createHash("sha256").update(payload.join("\n")).digest("hex");
}
