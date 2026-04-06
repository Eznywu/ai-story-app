"use client";

import React from "react";
import type { PosterCreateOutcome } from "@/lib/poster";
import { downloadPosterPng } from "@/lib/poster";

type Props = {
  imageUrl: string;
  title: string;
  outcome: PosterCreateOutcome;
  blob: Blob;
  onDismiss: () => void;
};

export function PosterFlashCard(props: Props) {
  const label =
    props.outcome === "illustrated"
      ? "Story poster (AI illustration)"
      : "Story poster (genre artwork — AI unavailable)";

  function handleDownload() {
    downloadPosterPng(props.blob, props.title.trim() || "Bedtime Story");
  }

  return (
    <div className="posterFlashBackdrop">
      <button
        type="button"
        className="posterFlashBackdropDim"
        aria-label="Close poster"
        onClick={props.onDismiss}
      />
      <div className="posterFlashCard" role="dialog" aria-labelledby="poster-flash-title" aria-modal="true">
        <div className="posterFlashCardInner">
          <div className="posterFlashHeader">
            <div className="posterFlashTitle" id="poster-flash-title">
              {props.title?.trim() ? props.title : "Your poster"}
            </div>
            <button className="posterFlashClose" type="button" onClick={props.onDismiss} aria-label="Close poster">
              ×
            </button>
          </div>
          <p className="posterFlashHint">{label}</p>
          <div className="posterFlashImageWrap">
            <img className="posterFlashImage" src={props.imageUrl} alt="" width={360} height={450} />
          </div>
          <div className="posterFlashActions">
            <button className="button buttonPrimary" type="button" onClick={handleDownload}>
              Download PNG
            </button>
            <button className="button" type="button" onClick={props.onDismiss}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
