"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { VoiceRecordingFlashCard } from "@/app/components/VoiceRecordingFlashCard";

type Phase = "idle" | "recording" | "preview" | "uploading";

function pickRecorderMime(): string | undefined {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

function defaultVoiceLabel() {
  const t = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `My voice ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

type Props = {
  language: string;
  disabled?: boolean;
  hasClone: boolean;
  onCloned: (voiceId: string, label: string, requiresVerification: boolean) => void;
  onClearClone: () => void;
};

export function VoiceRecorder(props: Props) {
  const { language, disabled, hasClone, onCloned, onClearClone } = props;
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [verifyHint, setVerifyHint] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [flashError, setFlashError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("");

  const revokePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingBlob(null);
    setVoiceName("");
    setFlashError("");
  }, []);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const uploadBlob = useCallback(
    async (blob: Blob, displayName: string) => {
      setFlashError("");
      const ext = mimeRef.current.includes("mp4") ? "m4a" : "webm";
      const form = new FormData();
      form.append("file", blob, `recording.${ext}`);
      form.append("language", language);
      form.append("name", displayName.trim() || defaultVoiceLabel());

      const res = await fetch("/api/voice-clone", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `Clone failed (${res.status})`);
      }
      const voiceId = typeof data?.voiceId === "string" ? data.voiceId : "";
      if (!voiceId) throw new Error("No voice id returned");
      const requiresVerification = Boolean(data?.requiresVerification);
      if (requiresVerification) {
        setVerifyHint("ElevenLabs may require verification for this voice—check your ElevenLabs account if audio fails.");
      } else {
        setVerifyHint("");
      }
      const label = displayName.trim() || defaultVoiceLabel();
      onCloned(voiceId, label, requiresVerification);
    },
    [language, onCloned]
  );

  const dismissPreview = useCallback(() => {
    revokePreview();
    setPhase("idle");
  }, [revokePreview]);

  const onSavePreview = useCallback(async () => {
    if (!pendingBlob) return;
    const name = voiceName.trim() || defaultVoiceLabel();
    setPhase("uploading");
    try {
      await uploadBlob(pendingBlob, name);
      revokePreview();
      setPhase("idle");
    } catch (e: unknown) {
      setFlashError(e instanceof Error ? e.message : "Save failed");
      setPhase("preview");
    }
  }, [pendingBlob, voiceName, uploadBlob, revokePreview]);

  const onStart = useCallback(async () => {
    setError("");
    setVerifyHint("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickRecorderMime();
      mimeRef.current = mime ?? "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: mimeRef.current || recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        recorderRef.current = null;
        if (blob.size < 800) {
          setPhase("idle");
          setError("Recording too short—speak for a few seconds, then stop.");
          return;
        }
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setPendingBlob(blob);
        setVoiceName(defaultVoiceLabel());
        setFlashError("");
        setPhase("preview");
      };

      recorder.start(250);
      setPhase("recording");
    } catch {
      setError("Could not access the microphone—check permissions.");
      setPhase("idle");
    }
  }, [stopStream]);

  const onStop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state === "recording") {
      r.stop();
    }
  }, []);

  const showFlash = (phase === "preview" || phase === "uploading") && Boolean(previewUrl);

  return (
    <div className="voiceRecorder">
      <p className="voiceRecorderHint">
        Record a short sample (about 30 seconds to a few minutes) of your own voice in a quiet place. When you stop,
        you can listen, name it, and save—then it appears in the Voice list above.
      </p>
      <div className="voiceRecorderActions">
        {phase === "recording" ? (
          <button className="button" type="button" onClick={onStop}>
            Stop recording
          </button>
        ) : (
          <button
            className="button"
            type="button"
            onClick={() => void onStart()}
            disabled={disabled || phase === "preview" || phase === "uploading"}
          >
            Record my voice
          </button>
        )}
        {hasClone ? (
          <button
            className="button buttonInline"
            type="button"
            onClick={() => onClearClone()}
            disabled={phase === "recording" || phase === "uploading" || phase === "preview"}
          >
            Clear saved voices
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="fieldErrorText" role="alert">
          {error}
        </p>
      ) : null}
      {verifyHint ? <p className="voiceRecorderVerify">{verifyHint}</p> : null}

      {showFlash && previewUrl ? (
        <VoiceRecordingFlashCard
          previewUrl={previewUrl}
          voiceName={voiceName}
          onVoiceNameChange={setVoiceName}
          onSave={() => void onSavePreview()}
          onCancel={dismissPreview}
          isSaving={phase === "uploading"}
          error={flashError}
        />
      ) : null}
    </div>
  );
}
