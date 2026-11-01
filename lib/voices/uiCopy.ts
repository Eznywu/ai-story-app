import { getMessages } from "@/lib/i18n/catalog";
import { fill } from "@/lib/i18n/locales";
import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from "./consent";
import { READING_PASSAGE } from "./passages";
import { normalizeAppLanguage, type AppLanguage } from "./language";

/**
 * Story-language copy for narration consent, the reading passage, and the
 * en / zh-Hant voice strings covered by tests. Screen chrome reads the same
 * catalog through the interface locale, which can differ from story language.
 */
export function voiceCopy(language: unknown) {
  const lang: AppLanguage = normalizeAppLanguage(language);
  const voice = getMessages(lang).voice;
  return {
    lang,
    consentVersion: CONSENT_TEXT_VERSION,
    consent: CONSENT_TEXT[lang],
    passage: READING_PASSAGE[lang],
    ...voice,
  };
}

export function formatSwitchNotice(fromName: string, toName: string, language: unknown): string {
  const lang = normalizeAppLanguage(language);
  const voice = getMessages(lang).voice;
  const template = lang === "zh-Hant" ? voice.switchNoticeZh : voice.switchNoticeEn;
  return fill(template, { from: fromName, to: toName });
}
