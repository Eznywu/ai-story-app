import library from "./libraryNarrators.json";
import { languagesMatch, normalizeAppLanguage, type AppLanguage } from "./language";

export type NarratorArchetype = "gentle" | "warm" | "calm" | "bright" | "classic";

export type LibraryVoice = (typeof library.voices)[number];

export type DefaultNarrator = {
  id: string;
  /** Friendly name in English. Parents see `displayName` for the selected language. */
  name: string;
  displayName: Record<AppLanguage, string>;
  /** Language this voice was built for. Offering it for the other language is a non-native risk. */
  primaryLanguage: AppLanguage;
  archetype: NarratorArchetype;
  description: Record<AppLanguage, string>;
  providerVoiceId: string;
  providerName: string;
  source: string;
  rightsNote: string;
  languages: AppLanguage[];
  accent: string;
  locale: string | null;
  category: string;
  freeUsersAllowed: boolean;
  noticePeriodDays: number | null;
  auditionStatus: "pending";
  elevenV3Verified: false;
  previewUrl: Partial<Record<AppLanguage, string>>;
  /** Model the Voice Library used for each language's sample. Not the model the app narrates with. */
  previewModelId: Partial<Record<AppLanguage, string>>;
  isDefault?: boolean;
};

const COPY: Record<
  string,
  { id: string; name: string; archetype: NarratorArchetype; description: Record<AppLanguage, string>; isDefault?: boolean }
> = {
  NOpBlnGInO9m6vDvFkFC: {
    id: "story-spuds",
    name: "Grandpa",
    archetype: "gentle",
    isDefault: true,
    description: {
      en: "Gentle and reassuring. A friendly grandpa for quiet adventures.",
      "zh-Hant": "溫柔而安心。像爺爺一樣，適合安靜的小冒險。",
    },
  },
  UgBBYS2sOqTuMpoF3BR0: {
    id: "story-mark",
    name: "Sunny",
    archetype: "warm",
    description: {
      en: "Warm and conversational. A natural voice, as if someone is sitting nearby.",
      "zh-Hant": "溫暖、像在聊天。聲音自然，像有人坐在旁邊說故事。",
    },
  },
  cCYjmrGZaI86GUJ7F2Nn: {
    id: "story-david",
    name: "Cedar",
    archetype: "calm",
    description: {
      en: "Calm with a lower voice. Deep and smooth for a bedtime listen.",
      "zh-Hant": "沉穩、聲音較低。適合睡前慢慢聽。",
    },
  },
  PCa5QtqUKnVu4yH3HxLp: {
    id: "story-aaron",
    name: "Leo",
    archetype: "bright",
    description: {
      en: "Bright and expressive. Animated storytelling without turning into a cartoon.",
      "zh-Hant": "明亮、有表情。故事聽起來活潑，但不會變成卡通腔。",
    },
  },
  y47FZICqt6oFf4Z89DXT: {
    id: "story-pastie",
    name: "Nia",
    archetype: "classic",
    description: {
      en: "Classic storyteller. A warm voice that carries a whole tale.",
      "zh-Hant": "經典說書人。溫暖的聲音，可以把一個故事講完。",
    },
  },
  SIdddo4tIfBnOJY8JYjx: {
    id: "story-tuntun",
    name: "Nuan",
    archetype: "gentle",
    isDefault: true,
    description: {
      en: "Gentle and reassuring. A soft Taiwanese Mandarin pace.",
      "zh-Hant": "溫柔而安心。台灣國語，語速輕、不著急。",
    },
  },
  ZhxuUPFU7Hvp3p8qIPQP: {
    id: "story-chun",
    name: "A-chun",
    archetype: "warm",
    description: {
      en: "Warm and conversational. Everyday Taiwanese Mandarin.",
      "zh-Hant": "溫暖、像在聊天。自然的台灣國語。",
    },
  },
  DowyQ68vDpgFYdWVGjc3: {
    id: "story-jason",
    name: "An",
    archetype: "calm",
    description: {
      en: "Calm with a lower voice. Steady Mandarin for a quiet night.",
      "zh-Hant": "沉穩、聲音較低。適合安靜的夜晚。",
    },
  },
  "9lHjugDhwqoxA5MhX0az": {
    id: "story-anna",
    name: "Anna",
    archetype: "bright",
    description: {
      en: "Bright and expressive. A friendly Taiwanese Mandarin voice.",
      "zh-Hant": "明亮、有表情。友善的台灣國語。",
    },
  },
  "4VZIsMPtgggwNg7OXbPY": {
    id: "story-james",
    name: "A-jie",
    archetype: "classic",
    description: {
      en: "Classic storyteller. A calm Mandarin voice for narrative.",
      "zh-Hant": "經典說書人。平穩的中文，適合把故事講完。",
    },
  },
  fQj4gJSexpu8RDE2Ii5m: {
    id: "story-yu",
    name: "Xiao Yu",
    archetype: "bright",
    description: {
      en: "Bright and expressive. A youthful Taiwanese Mandarin voice.",
      "zh-Hant": "明亮、有精神。年輕的台灣國語。",
    },
  },
  Y2kfOuWTL6V4UWWmDF0s: {
    id: "story-kk",
    name: "Coco",
    archetype: "classic",
    description: {
      en: "Classic storyteller. A friendly Taiwanese Mandarin voice that is easy to follow.",
      "zh-Hant": "經典說書人。友善的台灣國語，清楚好懂。",
    },
  },
};

const DISPLAY_NAME: Record<string, Record<AppLanguage, string>> = {
  "story-spuds": { en: "Grandpa", "zh-Hant": "爺爺" },
  "story-mark": { en: "Sunny", "zh-Hant": "桑尼" },
  "story-david": { en: "Cedar", "zh-Hant": "杉杉" },
  "story-aaron": { en: "Leo", "zh-Hant": "里歐" },
  "story-pastie": { en: "Nia", "zh-Hant": "妮雅" },
  "story-tuntun": { en: "Nuan", "zh-Hant": "暖暖" },
  "story-chun": { en: "A-chun", "zh-Hant": "阿春" },
  "story-jason": { en: "An", "zh-Hant": "安安" },
  "story-anna": { en: "Anna", "zh-Hant": "安娜" },
  "story-james": { en: "A-jie", "zh-Hant": "阿杰" },
  "story-yu": { en: "Xiao Yu", "zh-Hant": "小宇" },
  "story-kk": { en: "Coco", "zh-Hant": "可可" },
};

function rightsNote(voice: LibraryVoice): string {
  return [
    `ElevenLabs Voice Library shared voice, read on 2026-11-01 from GET /v1/shared-voices/${voice.providerVoiceId}.`,
    `Category ${voice.category}. Use case ${voice.useCase}. Descriptive label from the listing: ${voice.descriptive}.`,
    `free_users_allowed=${voice.freeUsersAllowed}. rate=${voice.rate}. fiat_rate=${voice.fiatRate ?? "null"} (no custom surcharge on the listing).`,
    `notice_period=${voice.noticePeriodDays ?? "unset"} days.`,
    "ElevenLabs states Voice Library voices are cleared for broad commercial use on paid plans, subject to the Terms of Use (join.elevenlabs.io/voice-library, checked 2026-11-01).",
    "Not an expiring Default premade (those retire 2026-12-31). Not a founder or family clone.",
    "Listening audition: pending. A transcript or listing is not a quality claim.",
    voice.elevenV3InVerifiedList
      ? "The listing includes eleven_v3."
      : "The verified-language list returned for this voice did not include eleven_v3. The app still uses the configured model and does not treat this listing as a v3 listening result.",
  ].join(" ");
}

function previewUrl(voice: LibraryVoice): Partial<Record<AppLanguage, string>> {
  const urls: Partial<Record<AppLanguage, string>> = {};
  if (voice.preview.en?.url) urls.en = voice.preview.en.url;
  if (voice.preview.zh?.url) urls["zh-Hant"] = voice.preview.zh.url;
  return urls;
}

function previewModelId(voice: LibraryVoice): Partial<Record<AppLanguage, string>> {
  const models: Partial<Record<AppLanguage, string>> = {};
  if (voice.preview.en?.modelId) models.en = voice.preview.en.modelId;
  if (voice.preview.zh?.modelId) models["zh-Hant"] = voice.preview.zh.modelId;
  return models;
}

export const DEFAULT_NARRATORS: DefaultNarrator[] = library.voices.map((voice) => {
  const copy = COPY[voice.providerVoiceId];
  if (!copy) throw new Error(`Missing app copy for library voice ${voice.providerVoiceId}`);
  const languages = voice.verifiedAppLanguages.map((code) => (code === "zh" ? "zh-Hant" : "en")) as AppLanguage[];
  const primaryLanguage: AppLanguage = voice.libraryLanguage === "zh" ? "zh-Hant" : "en";
  return {
    ...copy,
    displayName: DISPLAY_NAME[copy.id],
    primaryLanguage,
    providerVoiceId: voice.providerVoiceId,
    providerName: voice.providerName,
    source: `ElevenLabs Voice Library (${library.endpoint}, ${library.fetchedAt})`,
    rightsNote: rightsNote(voice),
    languages,
    accent: voice.accent,
    locale: voice.locale,
    category: voice.category,
    freeUsersAllowed: voice.freeUsersAllowed,
    noticePeriodDays: voice.noticePeriodDays,
    auditionStatus: "pending",
    elevenV3Verified: false,
    previewUrl: previewUrl(voice),
    previewModelId: previewModelId(voice),
  };
});

/** Founder and family clones. Hidden from the picker. Kept so older saved audio can still be identified. */
export const LEGACY_VOICES = [
  { id: "Eason_EN", name: "Eason_EN", providerVoiceId: "4LguZr3BgHUrmCOioCQW", language: "en" as const },
  { id: "Eason_CN", name: "Eason_CN", providerVoiceId: "XoqehnQ3P4qwqiNC3rDG", language: "zh-Hant" as const },
  { id: "Neva_CN", name: "Neva_CN", providerVoiceId: "JEeewzD9jFL4GqDHRhMc", language: "zh-Hant" as const },
] as const;

const LEGACY_IDS = new Set<string>(LEGACY_VOICES.map((voice) => voice.id));
const PROVIDER_ID = /^[A-Za-z0-9]{16,40}$/;

export function isLegacyVoiceId(voiceId: string): boolean {
  return LEGACY_IDS.has(voiceId);
}

export function legacyVoice(voiceId: string) {
  return LEGACY_VOICES.find((voice) => voice.id === voiceId) ?? null;
}

export function defaultNarratorById(voiceId: string): DefaultNarrator | null {
  return DEFAULT_NARRATORS.find((voice) => voice.id === voiceId) ?? null;
}

export function isNonNativeFor(voice: DefaultNarrator, language: unknown): boolean {
  return voice.primaryLanguage !== normalizeAppLanguage(language);
}

/** Taiwan Mandarin first, then other voices built for that language, then cross-language listings. */
export function defaultNarratorsFor(language: unknown): DefaultNarrator[] {
  const normalized = normalizeAppLanguage(language);
  return DEFAULT_NARRATORS.filter((voice) => languagesMatch(voice.languages, normalized)).sort((a, b) => {
    return offerRank(a, normalized) - offerRank(b, normalized);
  });
}

function offerRank(voice: DefaultNarrator, language: AppLanguage): number {
  if (voice.primaryLanguage !== language) return 30;
  if (language === "zh-Hant" && voice.locale !== "cmn-TW") return 20;
  return 10;
}

export function defaultNarratorFor(language: unknown): DefaultNarrator {
  const matches = defaultNarratorsFor(language);
  return matches.find((voice) => voice.isDefault) ?? matches[0] ?? DEFAULT_NARRATORS[0];
}

/** A raw provider id is not an app id and must not authorize anything. */
export function looksLikeProviderVoiceId(value: string): boolean {
  if (defaultNarratorById(value) || isLegacyVoiceId(value)) return false;
  if (value.startsWith("story-") || value.startsWith("clone:")) return false;
  return PROVIDER_ID.test(value);
}

export function libraryPreviewUrl(voice: DefaultNarrator, language: unknown): string | null {
  const normalized = normalizeAppLanguage(language);
  return voice.previewUrl[normalized] ?? null;
}

const LIBRARY_SAMPLE_HOSTS = new Set(["storage.googleapis.com", "api.us.elevenlabs.io", "api.elevenlabs.io"]);

/**
 * The Voice Library sample that ElevenLabs lists under this voice's verified language.
 * Only a sample in the requested language counts; another language's sample is never offered instead.
 */
export function librarySample(
  voice: DefaultNarrator | null | undefined,
  language: unknown
): { url: string; modelId: string | null } | null {
  if (!voice) return null;
  const normalized = normalizeAppLanguage(language);
  const url = voice.previewUrl[normalized];
  if (!url || !isLibrarySampleUrl(url)) return null;
  return { url, modelId: voice.previewModelId[normalized] ?? null };
}

export function isLibrarySampleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && LIBRARY_SAMPLE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
