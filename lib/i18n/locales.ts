/**
 * Interface language (the app chrome) is separate from story language and
 * narration language. Story generation still accepts only `en` and `zh-Hant`.
 *
 * zh-Hant is the existing zh-TW interface. zh-Hans is Simplified Chinese.
 * Spanish, Hindi, Arabic, French, Brazilian Portuguese, Russian, and Japanese
 * are draft translations pending native-speaker review. See each locale module.
 */

export const INTERFACE_LOCALES = [
  { code: "en", nativeName: "English", htmlLang: "en", intl: "en", dir: "ltr" },
  { code: "zh-Hant", nativeName: "繁體中文", htmlLang: "zh-Hant", intl: "zh-Hant", dir: "ltr" },
  { code: "zh-Hans", nativeName: "简体中文", htmlLang: "zh-Hans", intl: "zh-Hans", dir: "ltr" },
  { code: "es", nativeName: "Español", htmlLang: "es", intl: "es", dir: "ltr" },
  { code: "hi", nativeName: "हिन्दी", htmlLang: "hi", intl: "hi", dir: "ltr" },
  { code: "ar", nativeName: "العربية", htmlLang: "ar", intl: "ar", dir: "rtl" },
  { code: "fr", nativeName: "Français", htmlLang: "fr", intl: "fr", dir: "ltr" },
  { code: "pt-BR", nativeName: "Português", htmlLang: "pt-BR", intl: "pt-BR", dir: "ltr" },
  { code: "ru", nativeName: "Русский", htmlLang: "ru", intl: "ru", dir: "ltr" },
  { code: "ja", nativeName: "日本語", htmlLang: "ja", intl: "ja", dir: "ltr" },
] as const;

export type InterfaceLocale = (typeof INTERFACE_LOCALES)[number]["code"];

export const LOCALE_COOKIE = "hh_ui_locale";
export const LOCALE_STORAGE_KEY = "hh_ui_locale";

const LOCALE_SET = new Set<string>(INTERFACE_LOCALES.map((item) => item.code));

export function isInterfaceLocale(value: unknown): value is InterfaceLocale {
  return typeof value === "string" && LOCALE_SET.has(value);
}

export function localeMeta(code: InterfaceLocale) {
  const found = INTERFACE_LOCALES.find((item) => item.code === code);
  if (!found) return INTERFACE_LOCALES[0];
  return found;
}

/**
 * Story text and narration stay on en | zh-Hant.
 * Only those two interface languages may seed the story-language control.
 * Simplified Chinese and the other interface languages are not story languages.
 */
export function storyLanguageFromInterface(locale: InterfaceLocale): "en" | "zh-Hant" | null {
  if (locale === "en" || locale === "zh-Hant") return locale;
  return null;
}

type Ranked = { locale: InterfaceLocale; q: number; index: number };

function matchTag(tag: string): InterfaceLocale | null {
  const raw = tag.trim().toLowerCase().replace(/_/g, "-");
  if (!raw || raw === "*") return null;
  if (raw === "zh" || raw.startsWith("zh-hant") || raw.startsWith("zh-tw") || raw.startsWith("zh-hk") || raw.startsWith("zh-mo")) {
    return "zh-Hant";
  }
  if (raw.startsWith("zh-hans") || raw.startsWith("zh-cn") || raw.startsWith("zh-sg")) return "zh-Hans";
  if (raw.startsWith("pt")) return "pt-BR";
  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("hi")) return "hi";
  if (raw.startsWith("ar")) return "ar";
  if (raw.startsWith("fr")) return "fr";
  if (raw.startsWith("ru")) return "ru";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("en")) return "en";
  return null;
}

/** Best match from an Accept-Language header. English when nothing matches. */
export function matchAcceptLanguage(header: string | null | undefined): InterfaceLocale {
  if (!header) return "en";
  const ranked: Ranked[] = [];
  header.split(",").forEach((part, index) => {
    const [tagPart, ...params] = part.split(";");
    const locale = matchTag(tagPart || "");
    if (!locale) return;
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) q = parsed;
      }
    }
    if (q <= 0) return;
    ranked.push({ locale, q, index });
  });
  ranked.sort((a, b) => b.q - a.q || a.index - b.index);
  return ranked[0]?.locale ?? "en";
}

export function resolveInterfaceLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): InterfaceLocale {
  if (isInterfaceLocale(input.cookie)) return input.cookie;
  return matchAcceptLanguage(input.acceptLanguage);
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function formatNumber(locale: InterfaceLocale, value: number): string {
  return new Intl.NumberFormat(localeMeta(locale).intl).format(value);
}

export function formatDate(locale: InterfaceLocale, value: Date): string {
  return new Intl.DateTimeFormat(localeMeta(locale).intl, { dateStyle: "long" }).format(value);
}

export function formatClock(locale: InterfaceLocale, seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  const intl = localeMeta(locale).intl;
  const minuteText = new Intl.NumberFormat(intl).format(minutes);
  const secondText = new Intl.NumberFormat(intl, { minimumIntegerDigits: 2 }).format(remain);
  return `${minuteText}:${secondText}`;
}
