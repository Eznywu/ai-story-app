import { parseRecordingLocale } from "./recordingScripts";

export type AppLanguage = "en" | "zh-Hant";

/**
 * Story text and narration language. Only English and Traditional Chinese.
 * Other interface languages stay on this two-way choice. Do not use this for
 * the recording script: unknown values become English here on purpose.
 */
export function normalizeAppLanguage(value: unknown): AppLanguage {
  const raw = String(value ?? "").trim().toLowerCase().replace(/_/g, "-");
  if (raw.startsWith("zh")) return "zh-Hant";
  return "en";
}

/**
 * ISO 639-1 code for a model that accepts language_code.
 * English stays `en`. Traditional Chinese (Taiwan Mandarin) is sent as `zh`.
 */
export function providerLanguageCode(language: unknown): "en" | "zh" {
  return normalizeAppLanguage(language) === "zh-Hant" ? "zh" : "en";
}

/**
 * Whether a stored recording language can narrate this story language.
 * English matches English tags only. Any Chinese recording matches Traditional
 * Chinese stories, which is the only Chinese narration language. Other
 * recording locales do not match English.
 */
export function recordedLanguageMatchesStory(recorded: string, story: AppLanguage): boolean {
  const locale = parseRecordingLocale(recorded);
  if (locale === "en") return story === "en";
  if (locale === "zh-Hant" || locale === "zh-Hans") return story === "zh-Hant";
  if (locale) return false;
  const raw = recorded.trim().toLowerCase().replace(/_/g, "-");
  if (!raw) return false;
  if (story === "zh-Hant") return raw === "zh" || raw.startsWith("zh-");
  return raw === "en" || raw.startsWith("en-");
}

export function languagesMatch(voiceLanguages: readonly string[], language: unknown): boolean {
  const wanted = normalizeAppLanguage(language);
  return voiceLanguages.some((item) => recordedLanguageMatchesStory(String(item), wanted));
}
