import type { InterfaceLocale } from "./locales";
import { messages as ar, translationReview as arReview } from "./messages/ar";
import { messages as en, translationReview as enReview, type Messages } from "./messages/en";
import { messages as es, translationReview as esReview } from "./messages/es";
import { messages as fr, translationReview as frReview } from "./messages/fr";
import { messages as hi, translationReview as hiReview } from "./messages/hi";
import { messages as ja, translationReview as jaReview } from "./messages/ja";
import { messages as ptBR, translationReview as ptReview } from "./messages/pt-BR";
import { messages as ru, translationReview as ruReview } from "./messages/ru";
import { messages as zhHans, translationReview as hansReview } from "./messages/zh-Hans";
import { messages as zhHant, translationReview as hantReview } from "./messages/zh-Hant";

export type { Messages };

export const TRANSLATION_REVIEW = {
  en: enReview,
  "zh-Hant": hantReview,
  "zh-Hans": hansReview,
  es: esReview,
  hi: hiReview,
  ar: arReview,
  fr: frReview,
  "pt-BR": ptReview,
  ru: ruReview,
  ja: jaReview,
} as const;

const CATALOG: Record<InterfaceLocale, Messages> = {
  en,
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
  es,
  hi,
  ar,
  fr,
  "pt-BR": ptBR,
  ru,
  ja,
};

export function getMessages(locale: InterfaceLocale): Messages {
  return CATALOG[locale];
}

/** Locales whose wording is a draft and still needs a native speaker. */
export const PENDING_NATIVE_REVIEW = (Object.keys(TRANSLATION_REVIEW) as InterfaceLocale[]).filter(
  (code) => TRANSLATION_REVIEW[code] === "pending-native-review"
);
