"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import {
  appendStoredClonedVoice,
  clearStoredClonedVoices,
  mergeClonedVoiceIntoList,
  readStoredClonedVoices,
} from "@/lib/voices/clonedVoiceStorage";
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

function isVoiceApiItem(value: unknown): value is VoiceApiItem {
  if (!value || typeof value !== "object") return false;
  const item = value as VoiceApiItem;
  return Boolean(item.id || item.voiceId);
}

export function useTts(language: string) {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isMakingMp3, setIsMakingMp3] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchVoices = useCallback(async () => {
    setIsLoadingVoices(true);
    setVoicesError("");
    try {
      const res = await fetch("/api/voices", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Could not load voices (${res.status})`);
      }

      const list: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.voices)
          ? data.voices
          : [];
      const normalized: VoiceItem[] = list
        .filter(isVoiceApiItem)
        .map((v) => ({
          id: String(v.id ?? v.voiceId),
          name: typeof v.name === "string" ? v.name : undefined,
          language: typeof v.language === "string" ? v.language : undefined,
          isDefault: Boolean(v.isDefault),
        }));

      const merged = mergeClonedVoiceIntoList(normalized, readStoredClonedVoices()) as VoiceItem[];
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
    emotion: number,
    lang: string,
    storyId?: string
  ): Promise<{ savedAudioUrl: string | null }> {
    setIsMakingMp3(true);
    try {
      if (!text.trim()) throw new Error("Generate a story first.");

      const res = await fetch("/api/eleven-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          speed,
          emotion,
          language: lang,
          voiceId: selectedVoiceId || undefined,
          storyId: storyId?.trim() || undefined,
        }),
      });

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
      replaceAudioUrl(objectUrl);
      playCurrentAudio();

      const savedHeader = res.headers.get("X-Audio-Url")?.trim() || "";
      const savedAudioUrl = savedHeader.startsWith("/api/audio/") ? savedHeader : null;
      return { savedAudioUrl };
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
    async (elevenVoiceId: string, label = "My voice") => {
      appendStoredClonedVoice({
        elevenVoiceId,
        label: label.trim() || "My voice",
        language: languageGroup(language),
      });
      await fetchVoices();
      setSelectedVoiceId(makeCloneVoiceId(elevenVoiceId));
    },
    [fetchVoices, language]
  );

  const clearClonedVoice = useCallback(async () => {
    clearStoredClonedVoices();
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
