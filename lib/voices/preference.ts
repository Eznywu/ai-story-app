const KEY = "happy-horse.voice-preference.v1";

export type VoicePreference = { voiceId: string; language: string };

/** A local reminder of the last pick. It does not decide who owns a voice. */
export function readVoicePreference(): VoicePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<VoicePreference> | null;
    if (!parsed || typeof parsed.voiceId !== "string" || typeof parsed.language !== "string") return null;
    return { voiceId: parsed.voiceId, language: parsed.language };
  } catch {
    return null;
  }
}

export function writeVoicePreference(preference: VoicePreference) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(preference));
}
