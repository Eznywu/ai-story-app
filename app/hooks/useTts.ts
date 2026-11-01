"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getErrorMessage } from "@/lib/errors";
import { clientJson } from "@/lib/auth/clientApi";
import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";
import { readVoicePreference, writeVoicePreference } from "@/lib/voices/preference";

export type VoiceItem = {
  id: string;
  name?: string;
  description?: string;
  language?: string;
  languages?: string[];
  group?: "story" | "mine";
  kind?: "default" | "personal";
  status?: string;
  selectable?: boolean;
  isDefault?: boolean;
  nonNativeRisk?: boolean;
  testVoice?: boolean;
};

type VoiceApiItem = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  language?: unknown;
  languages?: unknown;
  group?: unknown;
  kind?: unknown;
  status?: unknown;
  selectable?: unknown;
  isDefault?: unknown;
  nonNativeRisk?: unknown;
  testVoice?: unknown;
};

export type PersonalVoiceAccess = "available" | "sign-in-required";

function languageGroup(language: string) {
  return language.toLowerCase().startsWith("zh") ? "zh-Hant" : "en";
}

function pickDefaultVoice(voices: VoiceItem[], language: string) {
  const normalizedLanguage = languageGroup(language);
  const compatible = voices.filter((voice) => {
    const langs = voice.languages?.length ? voice.languages : [voice.language || "en"];
    return langs.some((item) => languageGroup(item) === normalizedLanguage) && voice.selectable !== false && voice.group !== "mine";
  });
  return compatible.find((voice) => voice.isDefault) ?? compatible[0] ?? voices.find((voice) => voice.isDefault) ?? null;
}

function savedAudioUrlFromHeader(value: string): string | null {
  if (!value) return null;
  if (value.startsWith("/api/audio/")) return value;
  if (value.startsWith("https://") && value.includes(".blob.vercel-storage.com")) return value;
  return null;
}

function isVoiceApiItem(value: unknown): value is VoiceApiItem {
  if (!value || typeof value !== "object") return false;
  const item = value as VoiceApiItem;
  return typeof item.id === "string" && item.id.length > 0;
}

type Narration = {
  savedAudioUrl: string | null;
  audioCacheKey: string | null;
  audioConfigVersion: string | null;
  audioDictionaryVersion: string | null;
  audioModelId: string | null;
  audioVoiceId: string | null;
  audioSpeed: number | null;
  transcriptStatus: string | null;
};

export function useTts(language: string, externalAudioRef?: RefObject<HTMLAudioElement | null>) {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isMakingMp3, setIsMakingMp3] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState("");
  const [personalVoices, setPersonalVoices] = useState<PersonalVoiceAccess>("sign-in-required");
  const [voiceLimit, setVoiceLimit] = useState<number | null>(null);
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationsInFlight = useRef(new Map<string, Promise<Narration>>());
  const audioRef = externalAudioRef ?? internalAudioRef;

  const fetchVoices = useCallback(async () => {
    setIsLoadingVoices(true);
    setVoicesError("");
    try {
      const data = await clientJson<{ voices?: unknown[]; personalVoices?: unknown; voiceLimit?: unknown }>(
        `/api/voices?language=${encodeURIComponent(language)}`
      );
      setVoiceLimit(typeof data.voiceLimit === "number" && data.voiceLimit > 0 ? data.voiceLimit : null);
      const list: unknown[] = Array.isArray(data?.voices) ? data.voices : [];
      const normalized = list.filter(isVoiceApiItem).map((v) => ({
        id: String(v.id),
        name: typeof v.name === "string" ? v.name : undefined,
        description: typeof v.description === "string" ? v.description : undefined,
        language: typeof v.language === "string" ? v.language : undefined,
        languages: Array.isArray(v.languages) ? v.languages.filter((item): item is string => typeof item === "string") : undefined,
        group: v.group === "mine" ? ("mine" as const) : ("story" as const),
        kind: v.kind === "personal" ? ("personal" as const) : ("default" as const),
        status: typeof v.status === "string" ? v.status : undefined,
        selectable: v.selectable !== false,
        isDefault: Boolean(v.isDefault),
        nonNativeRisk: v.nonNativeRisk === true,
        testVoice: v.testVoice === true,
      }));
      setPersonalVoices(data.personalVoices === "available" ? "available" : "sign-in-required");
      setVoices(normalized);
      setSelectedVoiceId((prev) => {
        const saved = readVoicePreference();
        const preferred = prev || saved?.voiceId || "";
        if (preferred && normalized.some((voice) => voice.id === preferred)) return preferred;
        return pickDefaultVoice(normalized, language)?.id || "";
      });
      return normalized;
    } catch (e: unknown) {
      setVoicesError(getErrorMessage(e, "Could not load voices."));
      return [];
    } finally {
      setIsLoadingVoices(false);
    }
  }, [language]);

  useEffect(() => {
    if (!voices.length || selectedVoiceId) return;
    const fallback = pickDefaultVoice(voices, language);
    if (fallback?.id) setSelectedVoiceId(fallback.id);
  }, [language, voices, selectedVoiceId]);

  function replaceAudioUrl(next: string) {
    setAudioUrl((prev) => {
      if (prev.startsWith("blob:") && prev !== next) URL.revokeObjectURL(prev);
      return next;
    });
    const el = audioRef.current;
    if (!el || typeof window === "undefined") return;
    const absolute =
      next.startsWith("blob:") || next.startsWith("http")
        ? next
        : new URL(next, window.location.origin).href;
    if (el.src !== absolute) el.src = next;
  }

  function playCurrentAudio() {
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
    }, 60);
  }

  async function playSavedAudio(url: string) {
    if (!url.trim()) throw new Error("This story does not have saved narration yet.");
    replaceAudioUrl(url);
    playCurrentAudio();
  }

  /** A second tap while the same narration is still being made waits for it instead of paying again. */
  function makeMp3(text: string, speed: number, lang: string, storyId?: string, force = false): Promise<Narration> {
    const key = JSON.stringify([text, speed, lang, selectedVoiceId, storyId ?? "", force]);
    const running = narrationsInFlight.current.get(key);
    if (running) return running;
    const request = requestNarration(text, speed, lang, storyId, force).finally(() => {
      narrationsInFlight.current.delete(key);
    });
    narrationsInFlight.current.set(key, request);
    return request;
  }

  async function requestNarration(
    text: string,
    speed: number,
    lang: string,
    storyId?: string,
    force = false
  ): Promise<Narration> {
    setIsMakingMp3(true);
    try {
      if (!text.trim()) throw new Error("Generate a story first.");

      const res = await fetch("/api/eleven-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          speed,
          language: lang,
          voiceId: selectedVoiceId || undefined,
          storyId: storyId?.trim() || undefined,
          force,
        }),
      });

      if (redirectIfUnsigned(res.status)) {
        throw new Error("Sign in to continue.");
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `TTS failed (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("audio")) {
        throw new Error("Narration did not come back as audio. Try again.");
      }

      const savedHeader = res.headers.get("X-Audio-Url")?.trim() || "";
      const savedAudioUrl = savedAudioUrlFromHeader(savedHeader);
      if (savedAudioUrl) {
        // The player streams the saved copy, so do not download it twice.
        void res.body?.cancel().catch(() => {});
        replaceAudioUrl(savedAudioUrl);
      } else {
        const blob = await res.blob();
        if (!blob.size) {
          throw new Error("Voice failed, try again.");
        }
        replaceAudioUrl(URL.createObjectURL(blob));
      }
      const speedHeader = Number(res.headers.get("X-Audio-Speed"));
      playCurrentAudio();
      return {
        savedAudioUrl,
        audioCacheKey: res.headers.get("X-Audio-Cache-Key"),
        audioConfigVersion: res.headers.get("X-Audio-Config-Version"),
        audioDictionaryVersion: res.headers.get("X-Audio-Dictionary-Version"),
        audioModelId: res.headers.get("X-Audio-Model"),
        audioVoiceId: res.headers.get("X-Audio-Voice-Id"),
        audioSpeed: Number.isFinite(speedHeader) ? speedHeader : speed,
        transcriptStatus: res.headers.get("X-Audio-Transcript"),
      };
    } finally {
      setIsMakingMp3(false);
    }
  }

  function clearAudio() {
    setAudioUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  const chooseVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
    writeVoicePreference({ voiceId, language });
    void clientJson("/api/voice-preference", {
      method: "PUT",
      body: JSON.stringify({ voiceId, language }),
    }).catch(() => {});
  }, [language]);

  const registerClonedVoice = useCallback(
    async (voiceId: string) => {
      await fetchVoices();
      chooseVoice(voiceId);
    },
    [chooseVoice, fetchVoices]
  );

  const clearClonedVoice = useCallback(async () => {
    await fetchVoices();
  }, [fetchVoices]);

  const hasClonedVoice = useMemo(() => voices.some((voice) => voice.kind === "personal"), [voices]);

  return {
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
    audioUrl,
    audioRef,
    isMakingMp3,
    isLoadingVoices,
    voicesError,
    fetchVoices,
    personalVoices,
    voiceLimit,
    chooseVoice,
    makeMp3,
    playSavedAudio,
    clearAudio,
    registerClonedVoice,
    clearClonedVoice,
    hasClonedVoice,
  };
}
