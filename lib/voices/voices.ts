/** Client-selected cloned voice: `clone:` + ElevenLabs `voice_id` */
export const VOICE_CLONE_PREFIX = "clone:" as const;

export type Voice = {
  id: string;
  name: string;
  elevenId: string;
  language: string;
  isDefault?: boolean;
};

export function makeCloneVoiceId(elevenLabsVoiceId: string) {
  return `${VOICE_CLONE_PREFIX}${elevenLabsVoiceId}`;
}

export function isCloneVoiceId(voiceId: string) {
  return voiceId.startsWith(VOICE_CLONE_PREFIX);
}

export const VOICES: Voice[] = [
  { id: "Eason_EN", name: "Eason_EN", elevenId: "4LguZr3BgHUrmCOioCQW", language: "en", isDefault: true },
  { id: "Eason_CN", name: "Eason_CN", elevenId: "XoqehnQ3P4qwqiNC3rDG", language: "zh-Hant", isDefault: true },
  { id: "Neva_CN", name: "Neva_CN", elevenId: "JEeewzD9jFL4GqDHRhMc", language: "zh-Hant" },
];

function normalizeLanguage(language?: string) {
  const value = String(language ?? "en").toLowerCase();
  if (value.startsWith("zh")) return "zh-Hant";
  return "en";
}

export function getDefaultVoice(language?: string) {
  const normalized = normalizeLanguage(language);
  return (
    VOICES.find((voice) => voice.language === normalized && voice.isDefault) ??
    VOICES.find((voice) => voice.language === normalized) ??
    VOICES.find((voice) => voice.isDefault) ??
    VOICES[0] ??
    null
  );
}

export function resolveVoiceById(voiceId?: string, language?: string) {
  if (voiceId) {
    const id = String(voiceId);
    if (isCloneVoiceId(id)) {
      const elevenId = id.slice(VOICE_CLONE_PREFIX.length).trim();
      if (elevenId) {
        return {
          id,
          name: "My recording",
          elevenId,
          language: normalizeLanguage(language),
        };
      }
    }
    const hit = VOICES.find((voice) => voice.id === id);
    if (hit) return hit;
  }
  return getDefaultVoice(language);
}