import {
  defaultNarratorById,
  defaultNarratorFor,
  DEFAULT_NARRATORS,
  isLegacyVoiceId,
  legacyVoice,
} from "@/lib/voices/registry";
import { normalizeAppLanguage } from "@/lib/voices/language";

/** Old client prefix. It is no longer accepted as authorization. */
export const VOICE_CLONE_PREFIX = "clone:" as const;

export type Voice = {
  id: string;
  name: string;
  elevenId: string;
  language: string;
  isDefault?: boolean;
  legacy?: boolean;
};

export function makeCloneVoiceId(elevenLabsVoiceId: string) {
  return `${VOICE_CLONE_PREFIX}${elevenLabsVoiceId}`;
}

export function isCloneVoiceId(voiceId: string) {
  return voiceId.startsWith(VOICE_CLONE_PREFIX);
}

/** Public story voices. Family clones are not in this list. */
export const VOICES: Voice[] = DEFAULT_NARRATORS.map((voice) => ({
  id: voice.id,
  name: voice.name,
  elevenId: voice.providerVoiceId,
  language: voice.languages[0] ?? "en",
  isDefault: voice.isDefault,
}));

export function getDefaultVoice(language?: string): Voice | null {
  const narrator = defaultNarratorFor(language);
  return {
    id: narrator.id,
    name: narrator.name,
    elevenId: narrator.providerVoiceId,
    language: narrator.languages[0] ?? "en",
    isDefault: narrator.isDefault,
  };
}

/**
 * Resolves a known app id. An explicit unknown id returns null.
 * An empty id returns the default for that language.
 * Legacy family ids resolve only so older saved audio can be identified. They are marked legacy.
 */
export function resolveVoiceById(voiceId?: string, language?: string): Voice | null {
  if (voiceId && String(voiceId).trim()) {
    const id = String(voiceId).trim();
    if (isCloneVoiceId(id) || id.startsWith("v_")) return null;
    const legacy = legacyVoice(id);
    if (legacy || isLegacyVoiceId(id)) {
      if (!legacy) return null;
      return {
        id: legacy.id,
        name: legacy.name,
        elevenId: legacy.providerVoiceId,
        language: legacy.language,
        legacy: true,
      };
    }
    const narrator = defaultNarratorById(id);
    if (!narrator) return null;
    return {
      id: narrator.id,
      name: narrator.name,
      elevenId: narrator.providerVoiceId,
      language: normalizeAppLanguage(language),
      isDefault: narrator.isDefault,
    };
  }
  return getDefaultVoice(language);
}
