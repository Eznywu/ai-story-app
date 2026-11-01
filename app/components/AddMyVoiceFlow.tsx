"use client";

import { useEffect, useRef, useState } from "react";
import { voiceCopy } from "@/lib/voices/uiCopy";
import { preferredRecorderMime, recordingClipped, voicedDurationMs } from "@/lib/voices/recordingChecks";
import { CONSENT_TEXT_VERSION } from "@/lib/voices/consent";

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `voice_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type Step = "consent" | "record" | "review" | "saving" | "name" | "done" | "blocked";

type Props = {
  language: string;
  personalVoices: "available" | "sign-in-required";
  onCreated: (voiceId: string, selectable: boolean) => void;
  onClose: () => void;
};

export function AddMyVoiceFlow(props: Props) {
  const copy = voiceCopy(props.language);
  const [step, setStep] = useState<Step>(props.personalVoices === "available" ? "consent" : "blocked");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mime, setMime] = useState("");
  const [voicedMs, setVoicedMs] = useState(0);
  const [clipped, setClipped] = useState(false);
  const [name, setName] = useState(copy.lang === "zh-Hant" ? "我的聲音" : "My voice");
  const [voiceId, setVoiceId] = useState("");
  const [selectable, setSelectable] = useState(false);
  const [takeUrl, setTakeUrl] = useState("");
  const idempotency = useRef(newIdempotencyKey());
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const levels = useRef<number[]>([]);
  const peaks = useRef<number[]>([]);
  const started = useRef(0);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  function releaseMic() {
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    const preview = previewRef.current;
    return () => {
      releaseMic();
      if (preview) {
        preview.pause();
        preview.src = "";
      }
    };
  }, []);

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(copy.failed);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chosen = preferredRecorderMime((type) => MediaRecorder.isTypeSupported(type));
      const recorder = chosen ? new MediaRecorder(stream, { mimeType: chosen }) : new MediaRecorder(stream);
      setMime(recorder.mimeType || chosen || "audio/webm");
      chunks.current = [];
      levels.current = [];
      peaks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      recorder.onerror = () => {
        setError(copy.interrupted);
        releaseMic();
        setStep("review");
      };
      recorder.onstop = () => {
        const elapsed = Date.now() - started.current;
        const recorded = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
        const voiced = voicedDurationMs(levels.current, elapsed);
        const hot = recordingClipped(peaks.current);
        setTakeUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(recorded);
        });
        setSeconds(Math.round(elapsed / 1000));
        setVoicedMs(voiced);
        setClipped(hot);
        setBlob(recorded);
        releaseMic();
        if (voiced < 8000) setError(copy.tooQuiet);
        else if (hot) setError(copy.clipped);
        else if (elapsed < 60000) setError(copy.short);
        else setError("");
        setStep("review");
      };
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let frame = 0;
      const watch = () => {
        if (recorder.state !== "recording") {
          void audioContext.close().catch(() => {});
          return;
        }
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        let peak = 0;
        for (const value of data) {
          const sample = Math.abs(value - 128) / 128;
          sum += sample * sample;
          if (sample > peak) peak = sample;
        }
        levels.current.push(Math.sqrt(sum / data.length));
        peaks.current.push(peak);
        frame = window.requestAnimationFrame(watch);
      };
      recorderRef.current = recorder;
      started.current = Date.now();
      setSeconds(0);
      recorder.start(250);
      frame = window.requestAnimationFrame(watch);
      setStep("record");
      const tick = window.setInterval(() => {
        setSeconds(Math.round((Date.now() - started.current) / 1000));
        if (recorder.state !== "recording") window.clearInterval(tick);
      }, 500);
      void frame;
    } catch {
      releaseMic();
      setError(copy.micDenied);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
    else releaseMic();
  }

  function resetTake() {
    setTakeUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setBlob(null);
    setError("");
    setStep("consent");
    idempotency.current = newIdempotencyKey();
  }

  async function createVoice() {
    if (!blob) return;
    setStep("saving");
    setError("");
    const form = new FormData();
    const extension = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
    form.set("file", new File([blob], `recording.${extension}`, { type: mime || "audio/webm" }));
    form.set("name", name);
    form.set("language", copy.lang);
    form.set("durationMs", String(seconds * 1000));
    form.set("voicedMs", String(voicedMs));
    form.set("clipped", clipped ? "true" : "false");
    form.set("consent", "true");
    form.set("consentTextVersion", CONSENT_TEXT_VERSION);
    form.set("idempotencyKey", idempotency.current);
    try {
      const response = await fetch("/api/voice-clone", {
        method: "POST",
        headers: { "Idempotency-Key": idempotency.current },
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        voice?: { id?: string; selectable?: boolean; status?: string };
      };
      if (!response.ok || !data.voice?.id) {
        setError(data.error || copy.failed);
        setStep("review");
        return;
      }
      setVoiceId(data.voice.id);
      setSelectable(Boolean(data.voice.selectable));
      setStep(data.voice.selectable ? "name" : "done");
      if (!data.voice.selectable) setError(copy.verification);
    } catch {
      setError(copy.failed);
      setStep("review");
    }
  }

  async function saveName() {
    if (!voiceId) return;
    setError("");
    const response = await fetch(`/api/voices/${encodeURIComponent(voiceId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || copy.failed);
      return;
    }
    props.onCreated(voiceId, selectable);
  }

  const progress = Math.min(100, Math.round((seconds / 90) * 100));

  return (
    <div className="voiceFlow">
      {step === "blocked" ? (
        <>
          <h3 className="voiceFlow__title">{copy.signInTitle}</h3>
          <p>{copy.signInBody}</p>
          <button type="button" className="createScreen__submit" onClick={props.onClose}>
            {copy.signIn}
          </button>
        </>
      ) : null}
      {step === "consent" ? (
        <>
          <h3 className="voiceFlow__title">{copy.consentTitle}</h3>
          <p>{copy.consent}</p>
          <label className="voiceFlow__check">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>{copy.agree}</span>
          </label>
          <button type="button" className="createScreen__submit" disabled={!agreed} onClick={() => void startRecording()}>
            {copy.record}
          </button>
        </>
      ) : null}
      {step === "record" ? (
        <>
          <p>{copy.target}</p>
          <p className="voiceFlow__passage">{copy.passage}</p>
          <p className="voiceFlow__timer" aria-live="polite">
            {seconds}s
          </p>
          <div className="voiceFlow__bar" aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
          <button type="button" className="createScreen__submit" onClick={stopRecording}>
            {copy.stop}
          </button>
        </>
      ) : null}
      {step === "review" || step === "saving" ? (
        <>
          {takeUrl ? <audio ref={previewRef} controls src={takeUrl} /> : null}
          <div className="voiceFlow__actions">
            <button type="button" onClick={resetTake}>
              {copy.discard}
            </button>
            <button type="button" onClick={() => void startRecording()}>
              {copy.again}
            </button>
            <button type="button" className="createScreen__submit" disabled={!blob || clipped || voicedMs < 8000 || step === "saving"} onClick={() => void createVoice()}>
              {step === "saving" ? "…" : copy.useTake}
            </button>
          </div>
        </>
      ) : null}
      {step === "name" ? (
        <>
          <label className="createTouch__field">
            <span className="createScreen__label">{copy.nameLabel}</span>
            <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
          </label>
          <button type="button" className="createScreen__submit" onClick={() => void saveName()}>
            {copy.save}
          </button>
        </>
      ) : null}
      {step === "done" ? <p>{copy.verification}</p> : null}
      {error ? (
        <p className="fieldErrorText" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
