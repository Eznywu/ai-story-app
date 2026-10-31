"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { focusWrapIndex, focusableElements } from "@/app/components/focusWrap";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Bottom sheet. Opens as a modal dialog: the page behind is inert, Tab stays inside,
 * Escape and the dimmed area dismiss, and focus returns to whatever opened it.
 */
export function QuietSheet({ title, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialog) return;
      const items = focusableElements(dialog);
      const activeIndex = items.indexOf(document.activeElement as HTMLElement);
      const next = focusWrapIndex(items.length, activeIndex, event.shiftKey);
      if (next == null) return;
      event.preventDefault();
      items[next]?.focus();
    }

    dialog.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      dialog.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="quietSheet"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="quietSheet__panel"
        onFocus={(event) => {
          if (event.target === event.currentTarget) return;
          if (event.target instanceof HTMLElement) {
            event.target.scrollIntoView({ block: "nearest" });
          }
        }}
      >
        <div className="quietSheet__grab" aria-hidden />
        <div className="quietSheet__head">
          <h2 id={titleId} className="quietSheet__title">
            {title}
          </h2>
          <button ref={closeRef} type="button" className="quietSheet__close" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </dialog>,
    document.body
  );
}
