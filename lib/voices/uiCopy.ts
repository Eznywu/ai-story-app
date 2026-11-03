import { getMessages } from "@/lib/i18n/catalog";
import { fill } from "@/lib/i18n/locales";
import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from "./consent";
import { normalizeAppLanguage, type AppLanguage } from "./language";

/**
 * Story-language copy for narration consent and the en / zh-Hant voice strings
 * covered by tests. The recording passage comes from the interface locale, not
 * from this two-language normalizer.
 */
export function voiceCopy(language: unknown) {
  const lang: AppLanguage = normalizeAppLanguage(language);
  const voice = getMessages(lang).voice;
  return {
    lang,
    consentVersion: CONSENT_TEXT_VERSION,
    consent: CONSENT_TEXT[lang],
    ...voice,
  };
}

export function formatSwitchNotice(fromName: string, toName: string, language: unknown): string {
  const lang = normalizeAppLanguage(language);
  const voice = getMessages(lang).voice;
  const template = lang === "zh-Hant" ? voice.switchNoticeZh : voice.switchNoticeEn;
  return fill(template, { from: fromName, to: toName });
}
