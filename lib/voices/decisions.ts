import { consentAccepted } from "./consent";
import { languagesMatch, normalizeAppLanguage, type AppLanguage } from "./language";
import { cloneAttemptsPerHour, personalVoiceLimit, slotCeilingBlocks } from "./limits";
import {
  defaultNarratorById,
  defaultNarratorFor,
  defaultNarratorsFor,
  isLegacyVoiceId,
  isNonNativeFor,
  legacyVoice,
  looksLikeProviderVoiceId,
  type DefaultNarrator,
} from "./registry";

export type VoiceStatus = "ready" | "pending_verification" | "deleting" | "delete_failed";

export type OwnedVoice = {
  id: string;
  userId: string;
  displayName: string;
  language: AppLanguage;
  status: VoiceStatus;
  voiceVersion: number;
  requiresVerification: boolean;
};

export type PublicVoice = {
  id: string;
  name: string;
  description: string;
  language: AppLanguage;
  languages: AppLanguage[];
  group: "story" | "mine";
  kind: "default" | "personal";
  status: VoiceStatus | "pending_audition";
  selectable: boolean;
  isDefault?: boolean;
  nonNativeRisk?: boolean;
};

export function personalVoicesAllowed(input: {
  authEnabled: boolean;
  email: string;
  guestEmail: string;
  /** Email of the local test parent. Allowed only when `localTestParent` is true. */
  localTestParentEmail?: string;
  /** True only while `localTestParentEnabled()` holds. */
  localTestParent?: boolean;
}): boolean {
  const email = input.email.trim().toLowerCase();
  const guest = input.guestEmail.trim().toLowerCase();
  if (!email || email === guest) return false;
  const testParent = (input.localTestParentEmail ?? "").trim().toLowerCase();
  if (testParent && email === testParent) return input.localTestParent === true;
  if (!input.authEnabled) return false;
  return true;
}

export function toPublicDefault(voice: DefaultNarrator, language: unknown): PublicVoice {
  const appLanguage = normalizeAppLanguage(language);
  const nonNativeRisk = isNonNativeFor(voice, appLanguage);
  const speaks = languagesMatch(voice.languages, appLanguage);
  return {
    id: voice.id,
    name: voice.displayName[appLanguage],
    description: voice.description[appLanguage],
    language: voice.primaryLanguage,
    languages: voice.languages,
    group: "story",
    kind: "default",
    status: nonNativeRisk ? "pending_audition" : "ready",
    selectable: speaks && !nonNativeRisk,
    isDefault: Boolean(voice.isDefault && speaks && !nonNativeRisk),
    nonNativeRisk,
  };
}

export function toPublicPersonal(voice: OwnedVoice, language: unknown): PublicVoice {
  const appLanguage = normalizeAppLanguage(language);
  const selectable = voice.status === "ready" && !voice.requiresVerification;
  return {
    id: voice.id,
    name: voice.displayName,
    description: appLanguage === "zh-Hant" ? "我的聲音" : "My voice",
    language: voice.language,
    languages: [voice.language],
    group: "mine",
    kind: "personal",
    status: voice.requiresVerification ? "pending_verification" : voice.status,
    selectable,
  };
}

export type SynthesisDecision =
  | {
      ok: true;
      kind: "default" | "personal" | "legacy";
      appVoiceId: string;
      providerVoiceId: string;
      ownerId: string | null;
      voiceVersion: number;
      voiceKind: "default" | "personal" | "legacy";
      allowSynthesis: boolean;
      warning?: string;
      alternatives: string[];
    }
  | { ok: false; status: number; error: string; alternatives: string[] };

export function authorizeSynthesis(input: {
  requesterId: string;
  requestedId: string;
  language: unknown;
  owned: OwnedVoice[];
}): SynthesisDecision {
  const language = normalizeAppLanguage(input.language);
  const alternatives = defaultNarratorsFor(language).map((voice) => voice.id);
  const requested = input.requestedId.trim();
  if (!requested) {
    const voice = defaultNarratorFor(language);
    return {
      ok: true,
      kind: "default",
      appVoiceId: voice.id,
      providerVoiceId: voice.providerVoiceId,
      ownerId: null,
      voiceVersion: 1,
      voiceKind: "default",
      allowSynthesis: true,
      alternatives,
    };
  }
  if (requested.startsWith("clone:") || looksLikeProviderVoiceId(requested)) {
    return {
      ok: false,
      status: 403,
      error: "A provider voice id cannot be used from the app. Pick a story voice or one of your saved voices.",
      alternatives,
    };
  }
  const legacy = legacyVoice(requested);
  if (legacy || isLegacyVoiceId(requested)) {
    return {
      ok: true,
      kind: "legacy",
      appVoiceId: legacy?.id ?? requested,
      providerVoiceId: legacy?.providerVoiceId ?? "",
      ownerId: null,
      voiceVersion: 1,
      voiceKind: "legacy",
      allowSynthesis: false,
      warning: "That narrator is no longer offered. The saved recording still plays. Pick a story voice to make a new one.",
      alternatives,
    };
  }
  const story = defaultNarratorById(requested);
  if (story) {
    if (!languagesMatch(story.languages, language)) {
      return {
        ok: false,
        status: 409,
        error: `${story.name} does not read this language. Choose one of the voices that does. Your choice was not replaced.`,
        alternatives,
      };
    }
    return {
      ok: true,
      kind: "default",
      appVoiceId: story.id,
      providerVoiceId: story.providerVoiceId,
      ownerId: null,
      voiceVersion: 1,
      voiceKind: "default",
      allowSynthesis: true,
      alternatives,
    };
  }
  const owned = input.owned.find((voice) => voice.id === requested);
  if (!owned || owned.userId !== input.requesterId) {
    return { ok: false, status: 404, error: "That voice is not on this account.", alternatives };
  }
  if (owned.status === "deleting" || owned.status === "delete_failed") {
    return {
      ok: false,
      status: 409,
      error: "That voice is being deleted, so it cannot make a new recording.",
      alternatives,
    };
  }
  if (owned.status === "pending_verification" || owned.requiresVerification) {
    return {
      ok: false,
      status: 409,
      error: "That voice is waiting for a verification step, so it is not ready to use yet.",
      alternatives,
    };
  }
  const warning = languagesMatch([owned.language], language)
    ? undefined
    : "This voice was recorded in another language. It stays selected. You can pick a story voice for this language instead.";
  return {
    ok: true,
    kind: "personal",
    appVoiceId: owned.id,
    providerVoiceId: "",
    ownerId: owned.userId,
    voiceVersion: owned.voiceVersion,
    voiceKind: "personal",
    allowSynthesis: true,
    warning,
    alternatives,
  };
}

export function authorizeOwnedVoice(input: {
  requesterId: string;
  voiceId: string;
  owned: OwnedVoice[];
}): { ok: true; voice: OwnedVoice } | { ok: false; status: number; error: string } {
  if (looksLikeProviderVoiceId(input.voiceId) || input.voiceId.startsWith("clone:")) {
    return { ok: false, status: 403, error: "A provider voice id cannot be used from the app." };
  }
  const voice = input.owned.find((item) => item.id === input.voiceId);
  if (!voice || voice.userId !== input.requesterId) {
    return { ok: false, status: 404, error: "That voice is not on this account." };
  }
  return { ok: true, voice };
}

export type QuotaDecision = { ok: true } | { ok: false; status: number; error: string };

export function quotaAllowsCreate(input: {
  activeCount: number;
  attemptsInLastHour: number;
  voiceLimit: number | null;
  slotsUsed: number | null;
  env?: NodeJS.ProcessEnv;
}): QuotaDecision {
  const limit = personalVoiceLimit(input.env);
  if (input.activeCount >= limit) {
    return {
      ok: false,
      status: 409,
      error: `This account already has ${limit} personal ${limit === 1 ? "voice" : "voices"}. Delete one to add another.`,
    };
  }
  const attempts = cloneAttemptsPerHour(input.env);
  if (input.attemptsInLastHour >= attempts) {
    return { ok: false, status: 429, error: "Too many voice attempts just now. Wait a little while and try again." };
  }
  if (slotCeilingBlocks({ voiceLimit: input.voiceLimit, slotsUsed: input.slotsUsed, personalCount: input.activeCount })) {
    return {
      ok: false,
      status: 409,
      error: "The voice workspace has no open slot right now. Delete an unused voice and try again.",
    };
  }
  return { ok: true };
}

export function consentAllowsCreate(input: { accepted: unknown; textVersion: unknown }): QuotaDecision {
  if (consentAccepted(input)) return { ok: true };
  return { ok: false, status: 400, error: "Consent is required before a recording can be uploaded." };
}

export type SelectionResult = {
  voiceId: string;
  replaced: boolean;
  /** Empty unless a story voice was just changed because it cannot read this language. */
  notice: string;
  /** Set when a personal voice stays selected and the language does not match the recording. */
  personalNote: string;
};

/**
 * A personal voice is never swapped when the language changes.
 * A story voice changes only when that voice cannot read the new language.
 * The note names both voices. An empty previous choice does not invent a warning.
 */
export function selectionAfterLanguageChange(input: {
  previousId: string;
  previousKind: "default" | "personal" | "unknown";
  language: unknown;
  voices: PublicVoice[];
}): SelectionResult {
  const language = normalizeAppLanguage(input.language);
  const languageName = language === "zh-Hant" ? "中文" : "English";
  const current = input.voices.find((voice) => voice.id === input.previousId);
  const readyStory = input.voices.filter((voice) => voice.group === "story" && voice.selectable);
  const fallback = readyStory.find((voice) => voice.isDefault) ?? readyStory[0];
  const quiet = { replaced: false, notice: "", personalNote: "" };
  if (input.previousKind === "personal" || current?.kind === "personal") {
    const matches = current ? languagesMatch(current.languages, language) : true;
    const choices = readyStory.map((voice) => voice.name).slice(0, 5).join(", ");
    return {
      voiceId: input.previousId,
      replaced: false,
      notice: "",
      personalNote: matches
        ? ""
        : language === "zh-Hant"
          ? `${current?.name || "這個聲音"} 還是選著。它是用另一種語言錄的。這些故事聲音可以念中文：${choices}。`
          : `${current?.name || "This voice"} stays selected. It was recorded in another language. These story voices can read English: ${choices}.`,
    };
  }
  if (!current) {
    return { voiceId: fallback?.id || input.previousId, ...quiet };
  }
  if (languagesMatch(current.languages, language) && current.selectable) {
    return { voiceId: current.id, ...quiet };
  }
  if (!fallback || fallback.id === current.id) {
    return { voiceId: current.id, ...quiet };
  }
  const notice =
    language === "zh-Hant"
      ? `${current.name} 不會念中文。${fallback.name} 可以，所以改選 ${fallback.name}。`
      : `${current.name} doesn't read ${languageName}. ${fallback.name} can, so ${fallback.name} is selected.`;
  return { voiceId: fallback.id, replaced: true, notice, personalNote: "" };
}
