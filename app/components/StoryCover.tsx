"use client";

import { useState } from "react";
import { BrandMark } from "@/app/components/BrandMark";
import { coverFit, pickCover } from "@/lib/stories/storyCover";

type Props = {
  coverUrl?: string | null;
  illustrationUrl?: string | null;
  posterUrl?: string | null;
  /** Shown when no picture can be loaded. */
  fallbackLabel?: string | null;
  className?: string;
  /** Fires once every saved picture has failed, so the caller can offer a reload. */
  onAllFailed?: () => void;
  priority?: boolean;
};

/**
 * Square story art. Uses saved files only. A picture that is not square is contained over a soft,
 * blurred copy of itself, so a portrait keepsake is never stretched or cropped.
 */
export function StoryCover({ coverUrl, illustrationUrl, posterUrl, fallbackLabel, className, onAllFailed, priority }: Props) {
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const [fitByUrl, setFitByUrl] = useState<Record<string, "fill" | "contain">>({});
  const choice = pickCover({ coverUrl, illustrationUrl, posterUrl }, broken);
  const fit = choice ? fitByUrl[choice.url] ?? (choice.shape === "square" ? "fill" : "contain") : "fill";
  const classes = ["storyCover", `storyCover--${fit}`, className].filter(Boolean).join(" ");

  if (!choice) {
    return (
      <span className={`${classes} storyCover--empty`} role={fallbackLabel ? "img" : undefined} aria-label={fallbackLabel || undefined}>
        <span className="storyCover__fallback" aria-hidden>
          <BrandMark variant="light" className="storyCover__mark" label={null} />
        </span>
      </span>
    );
  }

  return (
    <span className={classes} data-cover-kind={choice.kind} data-cover-fit={fit}>
      {fit === "contain" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={choice.url} alt="" aria-hidden className="storyCover__backdrop" />
      ) : null}
      {/* Saved files are already sized. Next/Image would re-encode and crop them. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={choice.url}
        src={choice.url}
        alt=""
        className="storyCover__img"
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        onLoad={(event) => {
          const img = event.currentTarget;
          const measured = coverFit(img.naturalWidth, img.naturalHeight);
          setFitByUrl((current) => (current[choice.url] === measured ? current : { ...current, [choice.url]: measured }));
        }}
        onError={() => {
          const next = new Set(broken);
          next.add(choice.url);
          setBroken(next);
          if (!pickCover({ coverUrl, illustrationUrl, posterUrl }, next)) onAllFailed?.();
        }}
      />
    </span>
  );
}
