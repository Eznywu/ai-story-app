export type NarratorChoice = {
  id: string;
  languages?: string[];
  language?: string;
  selectable?: boolean;
  isDefault?: boolean;
  group?: "story" | "mine";
};

export type SavedNarratorPreference = { voiceId: string; language: string };

function languageGroup(language: string): "zh" | "en" {
  return language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function narratorReadsLanguage(voice: NarratorChoice, language: string): boolean {
  const want = languageGroup(language);
  const languages = voice.languages?.length ? voice.languages : [voice.language || "en"];
  return languages.some((item) => languageGroup(item) === want);
}

/** A language-compatible story voice. Never falls through to another language's default. */
export function defaultNarratorId(voices: NarratorChoice[], language: string): string {
  const compatible = voices.filter(
    (voice) => voice.group !== "mine" && voice.selectable !== false && narratorReadsLanguage(voice, language)
  );
  return (compatible.find((voice) => voice.isDefault) ?? compatible[0])?.id ?? "";
}

/**
 * An explicit pick is kept, including a mismatch, so narration can reject it
 * without substituting another voice. An automatic or other-language preference
 * is not explicit and is replaced by a voice that can read this language.
 */
export function narratorAfterVoicesLoad(input: {
  voices: NarratorChoice[];
  language: string;
  previousId: string;
  saved: SavedNarratorPreference | null;
  explicitId: string | null;
}): string {
  const explicit = input.explicitId?.trim() || "";
  if (explicit && input.voices.some((voice) => voice.id === explicit)) return explicit;
  const savedMatches =
    Boolean(input.saved?.voiceId) && languageGroup(input.saved?.language || "") === languageGroup(input.language);
  if (savedMatches) {
    const saved = input.voices.find((voice) => voice.id === input.saved?.voiceId);
    if (saved) return saved.id;
  }
  const previous = input.voices.find((voice) => voice.id === input.previousId.trim());
  if (previous && previous.selectable !== false && narratorReadsLanguage(previous, input.language)) {
    return previous.id;
  }
  return defaultNarratorId(input.voices, input.language);
}

/**
 * A saved recording's voice wins over the create-page query. The query is only
 * the voice to try when this story has no recording yet, and an explicit
 * mismatch stays selected so the refusal can name it.
 */
export function narratorForOpenStory(input: {
  voices: NarratorChoice[];
  language: string;
  savedVoiceId?: string | null;
  queryVoiceId?: string | null;
}): string {
  const saved = input.savedVoiceId?.trim() || "";
  if (saved && input.voices.some((voice) => voice.id === saved)) return saved;
  const query = input.queryVoiceId?.trim() || "";
  if (query && input.voices.some((voice) => voice.id === query)) return query;
  return defaultNarratorId(input.voices, input.language);
}
