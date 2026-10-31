"use client";

import React from "react";

type Tone = "neutral" | "error" | "success" | "permission";

type Props = {
  title: string;
  body: string;
  tone?: Tone;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  busy?: boolean;
};

export function AppStateCard({
  title,
  body,
  tone = "neutral",
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  busy = false,
}: Props) {
  return (
    <section className={`appStateCard appStateCard--${tone}`} role={tone === "error" ? "alert" : undefined}>
      <h3 className="appStateCard__title">{title}</h3>
      <p className="appStateCard__body">{body}</p>
      {primaryLabel || secondaryLabel ? (
        <div className="appStateCard__actions">
          {primaryLabel ? (
            <button className="button buttonPrimary" type="button" onClick={onPrimary} disabled={busy}>
              {primaryLabel}
            </button>
          ) : null}
          {secondaryLabel ? (
            <button className="button" type="button" onClick={onSecondary} disabled={busy}>
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
