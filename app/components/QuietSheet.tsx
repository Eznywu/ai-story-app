"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Bottom sheet. Tap the dimmed area, Close, or Escape to dismiss. */
export function QuietSheet({ title, onClose, children }: Props) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="quietSheet" role="presentation" onClick={onClose}>
      <div
        className="quietSheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="quietSheet__grab" aria-hidden />
        <div className="quietSheet__head">
          <h2 className="quietSheet__title">{title}</h2>
          <button type="button" className="quietSheet__close" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
