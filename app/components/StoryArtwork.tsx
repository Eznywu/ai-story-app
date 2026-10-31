"use client";

import { BrandMark } from "@/app/components/BrandMark";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  kind: "cover" | "keepsake";
  title: string;
  caption?: string | null;
  dedication?: string | null;
  illustrationUrl?: string | null;
  status: "idle" | "generating" | "illustrated" | "fallback" | "error" | "pending";
  message?: string | null;
  large?: boolean;
  onIllustrationError?: () => void;
};

/**
 * Square cover and 4:5 keepsake. The illustration is contained, not cropped,
 * and the title, caption, and logo sit outside it.
 */
export function StoryArtwork({
  kind,
  title,
  caption,
  dedication,
  illustrationUrl,
  status,
  message,
  large = false,
  onIllustrationError,
}: Props) {
  const failed = status === "fallback" || status === "error";
  const pending = status === "generating" || status === "pending" || status === "idle";

  return (
    <figure
      className={`artworkFrame artworkFrame--${kind}${large ? " artworkFrame--large" : ""}${failed ? " artworkFrame--failure" : ""}`}
      data-testid={failed ? "artwork-failure" : `artwork-${kind}`}
      data-artwork-status={status}
    >
      <div className="artworkFrame__art">
        {illustrationUrl && !failed ? (
          // The master is a stored illustration. Next/Image would crop it through the cover fit.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={illustrationUrl}
            alt=""
            className="artworkFrame__img"
            onError={onIllustrationError}
          />
        ) : (
          <div className="artworkFrame__fallback" role="img" aria-label={failed ? "Simple cover" : "Cover"}>
            <BrandMark variant="onDark" className="artworkFrame__mark" label={null} />
            <span>{pending ? "Painting the cover…" : "Simple cover"}</span>
          </div>
        )}
      </div>
      <figcaption className="artworkFrame__copy">
        <p className="artworkFrame__title">{title.trim() || "Happy Horse"}</p>
        {caption?.trim() ? <p className="artworkFrame__caption">{caption.trim()}</p> : null}
        {dedication?.trim() ? <p className="artworkFrame__dedication">{dedication.trim()}</p> : null}
        <p className="artworkFrame__brand">
          <BrandMark variant="light" className="artworkFrame__logo" label={null} />
          <span>{BRAND_NAME}</span>
        </p>
        {failed && message ? <p className="artworkFrame__message">{message}</p> : null}
      </figcaption>
    </figure>
  );
}
