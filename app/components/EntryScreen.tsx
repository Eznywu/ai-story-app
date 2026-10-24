"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./EntryScreen.css";

type Props = {
  onFinished: () => void;
};

const EXIT_TRANSITION_MS = 720;

export function EntryScreen({ onFinished }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const holdMs = reduced ? 480 : 1700;
    const id = window.setTimeout(() => setExiting(true), holdMs);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const id = window.setTimeout(onFinished, EXIT_TRANSITION_MS);
    return () => clearTimeout(id);
  }, [exiting, onFinished]);

  return (
    <div
      className={`entryScreen ${exiting ? "entryScreen--exit" : ""}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="entryScreen__brandWrap">
        <span className="entryScreen__spark entryScreen__spark--one" aria-hidden />
        <span className="entryScreen__spark entryScreen__spark--two" aria-hidden />
        <div className="entryScreen__logoBox">
          <Image
            src="/emrys-story-logo.png"
            alt="EMRSY STORY — AI audiobook app"
            width={1024}
            height={558}
            priority
            sizes="(max-width: 430px) 92vw, 420px"
            className="entryScreen__brand"
          />
          <p className="entryScreen__tagline">Warm stories. Gentle nights.</p>
        </div>
      </div>
    </div>
  );
}
