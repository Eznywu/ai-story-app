"use client";

import React from "react";

type Props = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioUrl: string;
  isPreparing?: boolean;
};

export function PlaybackPanel({ audioRef, audioUrl, isPreparing = false }: Props) {
  function play() {
    audioRef.current?.play().catch(() => {});
  }
  function stop() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }

  return (
    <section className="panel">
      <h2 className="panelTitle">Playback</h2>
      {isPreparing ? (
        <div className="playbackPreparing" aria-live="polite">
          <span className="spinner spinnerSmall" aria-hidden />
          <span>Preparing audio…</span>
        </div>
      ) : null}
      <audio
        ref={audioRef}
        controls
        src={audioUrl || undefined}
        className="audio"
        aria-busy={isPreparing}
      />
      <div className="actions">
        <button
          className="button"
          onClick={play}
          type="button"
          disabled={!audioUrl || isPreparing}
        >
          Play
        </button>
        <button className="button" onClick={stop} type="button" disabled={!audioUrl && !isPreparing}>
          Stop
        </button>
      </div>
    </section>
  );
}
