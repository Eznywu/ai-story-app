"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  /** When there is no prior history entry (e.g. this page was opened directly). */
  fallbackHref?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Goes to the previous screen using the browser history stack when available.
 */
export function BackButton({ fallbackHref = "/", className = "button", children = "← Back" }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
    >
      {children}
    </button>
  );
}
