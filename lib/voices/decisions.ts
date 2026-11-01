import { consentAccepted } from "./consent";
import { languagesMatch, normalizeAppLanguage, type AppLanguage } from "./language";
import { cloneAttemptsPerHour, personalVoiceLimit, slotCeilingBlocks } from "./limits";
import {
  defaultNarratorById,
  defaultNarratorFor,
  defaultNarratorsFor,
  isLegacyVoiceId,
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
  status: VoiceStatus;
  selectable: boolean;
  isDefault?: boolean;
};

export function personalVoicesAllowed(input: { authEnabled: boolean; email: string; guestEmail: string }): boolean {
  if (!input.authEnabled) return false;
  return input.email.trim().toLowerCase() !== input.guestEmail;
}

export function toPublicDefault(voice: DefaultNarrator, language: unknown): PublicVoice {
  const appLanguage = normalizeAppLanguage(language);
  return {
    id: voice.id,
    name: voice.name,
    description: voice.description[appLanguage],
    language: voice.languages[0] ?? "en",
    languages: voice.languages,
    group: "story",
    kind: "default",
    status: "ready",
    selectable: languagesMatch(voice.languages, appLanguage),
    isDefault: Boolean(voice.isDefault && languagesMatch(voice.languages, appLanguage)),
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
  notice: string;
};

/**
 * A personal voice is never swapped for a default when the language changes.
 * An incompatible story voice is left in place with an explanation, so the change is visible.
 */
export function selectionAfterLanguageChange(input: {
  previousId: string;
  previousKind: "default" | "personal" | "unknown";
  language: unknown;
  voices: PublicVoice[];
}): SelectionResult {
  const language = normalizeAppLanguage(input.language);
  const current = input.voices.find((voice) => voice.id === input.previousId);
  const fallback = input.voices.find((voice) => voice.group === "story" && voice.selectable && voice.isDefault)
    ?? input.voices.find((voice) => voice.group === "story" && voice.selectable);
  if (input.previousKind === "personal" || current?.kind === "personal") {
    return {
      voiceId: input.previousId,
      replaced: false,
      notice: current && languagesMatch(current.languages, language)
        ? ""
        : "Your voice stays selected. It was recorded for another language. Story voices below can read this one.",
    };
  }
  if (current && languagesMatch(current.languages, language) && current.selectable) {
    return { voiceId: current.id, replaced: false, notice: "" };
  }
  if (!fallback) return { voiceId: input.previousId, replaced: false, notice: "" };
  return {
    voiceId: fallback.id,
    replaced: fallback.id !== input.previousId,
    notice: "That story voice does not read this language. A voice that does is selected.",
  };
}
