type VoiceLike = {
  id?: string;
  name?: string;
  language?: string;
};

/** Drop provider suffixes such as `_CN` so a voice can read as "Eason · Mandarin". */
export function friendlyVoiceName(voice?: VoiceLike | null): string {
  const raw = (voice?.name || voice?.id || "").trim();
  if (!raw) return "";
  const stripped = raw
    .replace(/[_\s-]+(en|cn|zh|zh-hant|zh-hans)$/i, "")
    .replace(/_/g, " ")
    .trim();
  return stripped || raw;
}

export function languageLabel(language?: string | null): string {
  const value = (language || "").toLowerCase();
  if (value.startsWith("zh")) return "Mandarin";
  if (value.startsWith("en")) return "English";
  return (language || "").trim();
}

export function voiceSummary(voice?: VoiceLike | null, language?: string | null): string {
  const name = friendlyVoiceName(voice);
  const lang = languageLabel(voice?.language || language);
  if (name && lang) return `${name} · ${lang}`;
  return name || lang || "Choose a voice";
}
