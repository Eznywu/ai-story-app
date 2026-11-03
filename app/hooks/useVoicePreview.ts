"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";

export type VoicePreviewStatus = "idle" | "loading" | "playing" | "error";

export type VoicePreviewState = {
  voiceId: string;
  status: VoicePreviewStatus;
  message: string;
};

export type VoicePreviewCopy = {
  previewUnavailable: string;
  previewLimit: string;
  previewFailed: string;
  previewTapAgain: string;
};

const IDLE: VoicePreviewState = { voiceId: "", status: "idle", message: "" };

export function voicePreviewUrl(voiceId: string, language: string) {
  return `/api/voice-preview?voiceId=${encodeURIComponent(voiceId)}&language=${encodeURIComponent(language)}`;
}

/** Turns the server's reason into the sentence parents see. Nothing else is played in its place. */
export function previewFailureMessage(reason: unknown, copy: VoicePreviewCopy): string {
  if (reason === "daily_cap_reached") return copy.previewLimit;
  if (reason === "live_preview_off" || reason === "no_provider_voice" || reason === "not_ready") return copy.previewUnavailable;
  return copy.previewFailed;
}

/**
 * One preview at a time. Play starts inside the tap so iPhone Safari allows sound. A new preview, Stop,
 * closing the sheet, or leaving the screen stops the current one. Failures show a message and Retry.
 */
export function useVoicePreview(copy: VoicePreviewCopy) {
  const [state, setState] = useState<VoicePreviewState>(IDLE);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = useRef<{ token: number; voiceId: string; url: string } | null>(null);
  const tokens = useRef(0);
  const copyRef = useRef(copy);
  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

  const fail = useCallback(async (token: number, kind: "load" | "gesture") => {
    const active = current.current;
    if (!active || active.token !== token) return;
    current.current = null;
    audioRef.current?.pause();
    if (kind === "gesture") {
      setState({ voiceId: active.voiceId, status: "error", message: copyRef.current.previewTapAgain });
      return;
    }
    let message = copyRef.current.previewFailed;
    try {
      const response = await fetch(active.url, { cache: "no-store" });
      if (redirectIfUnsigned(response.status)) return;
      if (!(response.headers.get("content-type") || "").startsWith("audio/")) {
        const data = (await response.json().catch(() => ({}))) as { reason?: unknown };
        message = previewFailureMessage(data.reason, copyRef.current);
      }
    } catch {
      /* keep the general message */
    }
    setState((now) => (now.voiceId === active.voiceId && now.status !== "playing" ? { voiceId: active.voiceId, status: "error", message } : now));
  }, []);

  const element = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "auto";
    audio.addEventListener("playing", () => {
      const active = current.current;
      if (active) setState({ voiceId: active.voiceId, status: "playing", message: "" });
    });
    audio.addEventListener("ended", () => {
      current.current = null;
      setState(IDLE);
    });
    audio.addEventListener("error", () => {
      const active = current.current;
      if (!active) return;
      if (audio.src !== new URL(active.url, window.location.href).href) return;
      void fail(active.token, "load");
    });
    audioRef.current = audio;
    return audio;
  }, [fail]);

  const stop = useCallback(() => {
    current.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setState(IDLE);
  }, []);

  const toggle = useCallback(
    (voiceId: string, language: string) => {
      const active = current.current;
      if (active?.voiceId === voiceId) {
        stop();
        return;
      }
      stop();
      const token = (tokens.current += 1);
      const url = voicePreviewUrl(voiceId, language);
      current.current = { token, voiceId, url };
      setState({ voiceId, status: "loading", message: "" });
      const audio = element();
      audio.src = url;
      const started = audio.play();
      started?.catch((error: unknown) => {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "AbortError") return;
        void fail(token, name === "NotAllowedError" ? "gesture" : "load");
      });
    },
    [element, fail, stop]
  );

  useEffect(() => stop, [stop]);

  return { state, toggle, stop };
}

export type VoicePreviewControls = ReturnType<typeof useVoicePreview>;
