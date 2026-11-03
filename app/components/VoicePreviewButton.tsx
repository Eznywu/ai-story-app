"use client";

import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import type { VoicePreviewControls } from "@/app/hooks/useVoicePreview";

type Props = {
  voiceId: string;
  name: string;
  language: string;
  preview: VoicePreviewControls;
  className?: string;
};

function statusOf(preview: VoicePreviewControls, voiceId: string) {
  return preview.state.voiceId === voiceId ? preview.state.status : "idle";
}

/** Preview, then Loading…, then Stop. After a failure the same button retries. */
export function VoicePreviewButton({ voiceId, name, language, preview, className }: Props) {
  const { messages } = useInterfaceLocale();
  const copy = messages.voice;
  const status = statusOf(preview, voiceId);
  const label =
    status === "loading" ? copy.previewLoading : status === "playing" ? copy.previewStop : status === "error" ? copy.tryAgain : copy.preview;
  return (
    <button
      type="button"
      className={["voicePreview", `voicePreview--${status}`, className].filter(Boolean).join(" ")}
      aria-label={`${label} ${name}`.trim()}
      aria-busy={status === "loading"}
      onClick={() => preview.toggle(voiceId, language)}
    >
      <span className="voicePreview__icon" aria-hidden />
      <span>{label}</span>
    </button>
  );
}

/** The honest reason a preview could not play. Only shown for the voice that failed. */
export function VoicePreviewError({ voiceId, preview }: { voiceId: string; preview: VoicePreviewControls }) {
  if (statusOf(preview, voiceId) !== "error" || !preview.state.message) return null;
  return (
    <p className="voicePreviewError" role="alert">
      {preview.state.message}
    </p>
  );
}
