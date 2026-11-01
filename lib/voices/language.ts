export type AppLanguage = "en" | "zh-Hant";

/** App language used for story text, narration, and voice compatibility. */
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

export function languagesMatch(voiceLanguages: readonly string[], language: unknown): boolean {
  const wanted = normalizeAppLanguage(language);
  return voiceLanguages.some((item) => normalizeAppLanguage(item) === wanted);
}
