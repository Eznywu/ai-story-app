"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getErrorMessage } from "@/lib/errors";
import { clientJson } from "@/lib/auth/clientApi";
import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";
import { clearStoredClonedVoices, readStoredClonedVoices } from "@/lib/voices/clonedVoiceStorage";
import { isCloneVoiceId, makeCloneVoiceId } from "@/lib/voices/voices";

export type VoiceItem = {
  id: string;
  name?: string;
  language?: string;
  isDefault?: boolean;
};

type VoiceApiItem = {
  id?: unknown;
  voiceId?: unknown;
  name?: unknown;
  language?: unknown;
  isDefault?: unknown;
};

function languageGroup(language: string) {
  return language.toLowerCase().startsWith("zh") ? "zh-Hant" : "en";
}

function pickDefaultVoice(voices: VoiceItem[], language: string) {
  const normalizedLanguage = languageGroup(language);
  return (
    voices.find((v) => v.language === normalizedLanguage && v.isDefault) ??
    voices.find((v) => v.language === normalizedLanguage) ??
    voices.find((v) => v.isDefault) ??
    voices[0] ??
    null
  );
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
  return Boolean(item.id || item.voiceId);
}

export function useTts(language: string, externalAudioRef?: RefObject<HTMLAudioElement | null>) {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isMakingMp3, setIsMakingMp3] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState("");
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = externalAudioRef ?? internalAudioRef;

  const fetchVoices = useCallback(async () => {
    setIsLoadingVoices(true);
    setVoicesError("");
    try {
      const data = await clientJson<{ voices?: unknown[] } | unknown[]>("/api/voices");

      const list: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.voices)
          ? data.voices
          : [];
      const toVoiceItems = (rows: unknown[]): VoiceItem[] =>
        rows.filter(isVoiceApiItem).map((v) => ({
          id: String(v.id ?? v.voiceId),
          name: typeof v.name === "string" ? v.name : undefined,
          language: typeof v.language === "string" ? v.language : undefined,
          isDefault: Boolean(v.isDefault),
        }));

      let normalized = toVoiceItems(list);
      const localClones = readStoredClonedVoices();
      const knownIds = new Set(normalized.map((voice) => voice.id));
      const pending = localClones.filter(
        (entry) => !knownIds.has(makeCloneVoiceId(entry.elevenVoiceId))
      );
      if (pending.length) {
        let claimFailed = false;
        for (const entry of pending) {
          try {
            await clientJson("/api/voices", {
              method: "POST",
              body: JSON.stringify({
                elevenVoiceId: entry.elevenVoiceId,
                label: entry.label,
                language: entry.language,
              }),
            });
          } catch (error: unknown) {
            const message = getErrorMessage(error, "");
            if (!message.includes("another account")) claimFailed = true;
          }
        }
        if (!claimFailed) {
          clearStoredClonedVoices();
          const refreshed = await clientJson<{ voices?: unknown[] }>("/api/voices");
          normalized = toVoiceItems(Array.isArray(refreshed.voices) ? refreshed.voices : []);
        }
      } else if (localClones.length) {
        clearStoredClonedVoices();
      }

      const merged = normalized;
      setVoices(merged);
      setSelectedVoiceId((prev) => {
        if (prev && merged.some((v) => v.id === prev)) return prev;
        return pickDefaultVoice(merged, language)?.id || "";
      });
      return merged;
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

  async function makeMp3(
    text: string,
    speed: number,
    lang: string,
    storyId?: string,
    force = false
  ): Promise<{
    savedAudioUrl: string | null;
    audioCacheKey: string | null;
    audioConfigVersion: string | null;
    audioDictionaryVersion: string | null;
    audioModelId: string | null;
    audioVoiceId: string | null;
    audioSpeed: number | null;
    transcriptStatus: string | null;
  }> {
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

      const blob = await res.blob();
      if (!blob.size) {
        throw new Error("Voice failed, try again.");
      }

      const objectUrl = URL.createObjectURL(blob);
      const savedHeader = res.headers.get("X-Audio-Url")?.trim() || "";
      const savedAudioUrl = savedAudioUrlFromHeader(savedHeader);
      const speedHeader = Number(res.headers.get("X-Audio-Speed"));
      replaceAudioUrl(savedAudioUrl || objectUrl);
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

  const registerClonedVoice = useCallback(
    async (elevenVoiceId: string) => {
      await fetchVoices();
      setSelectedVoiceId(makeCloneVoiceId(elevenVoiceId));
    },
    [fetchVoices]
  );

  const clearClonedVoice = useCallback(async () => {
    clearStoredClonedVoices();
    await clientJson("/api/voices", { method: "DELETE" });
    await fetchVoices();
  }, [fetchVoices]);

  const hasClonedVoice = useMemo(() => voices.some((v) => isCloneVoiceId(v.id)), [voices]);

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
    makeMp3,
    playSavedAudio,
    clearAudio,
    registerClonedVoice,
    clearClonedVoice,
    hasClonedVoice,
  };
}
