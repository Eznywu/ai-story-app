"use client";

import React from "react";
import type { PosterCreateOutcome } from "@/lib/posters/poster";
import { downloadPosterPng } from "@/lib/posters/poster";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";

type Props = {
  imageUrl: string;
  title: string;
  outcome: PosterCreateOutcome;
  blob: Blob;
  /** Shown when `outcome` is `text_fallback` (why genre artwork was used). */
  fallbackHint?: string;
  onDismiss: () => void;
};

export function PosterFlashCard(props: Props) {
  const { messages } = useInterfaceLocale();
  const copy = messages.poster;
  const label = props.outcome === "illustrated" ? copy.illustrated : copy.simple;

  function handleDownload() {
    downloadPosterPng(props.blob, props.title.trim() || "Happy Horse");
  }

  return (
    <div className="posterFlashBackdrop">
      <button
        type="button"
        className="posterFlashBackdropDim"
        aria-label={copy.close}
        onClick={props.onDismiss}
      />
      <div className="posterFlashCard" role="dialog" aria-labelledby="poster-flash-title" aria-modal="true">
        <div className="posterFlashCardInner">
          <div className="posterFlashHeader">
            <div className="posterFlashTitle" id="poster-flash-title">
              {props.title?.trim() ? props.title : copy.yours}
            </div>
            <button className="posterFlashClose" type="button" onClick={props.onDismiss} aria-label={copy.close}>
              ×
            </button>
          </div>
          <p className="posterFlashHint">{label}</p>
          {props.outcome === "text_fallback" && props.fallbackHint ? (
            <p className="posterFlashFallbackReason">{props.fallbackHint}</p>
          ) : null}
          <div className="posterFlashImageWrap">
            {/* Generated blob/data URL; next/image does not apply */}
            {/* eslint-disable-next-line @next/next/no-img-element -- preview uses object URLs */}
            <img className="posterFlashImage" src={props.imageUrl} alt="" width={360} height={450} />
          </div>
          <div className="posterFlashActions">
            <button className="button buttonPrimary" type="button" onClick={handleDownload}>
              {copy.download}
            </button>
            <button className="button" type="button" onClick={props.onDismiss}>
              {copy.done}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
