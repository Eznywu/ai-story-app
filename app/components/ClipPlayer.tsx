"use client";

import { useRef, useState } from "react";

type Props = {
  src: string;
  playLabel: string;
  pauseLabel: string;
  progressLabel: string;
};

/** Small navy play control. The audio element stays hidden so the browser bar does not show. */
export function ClipPlayer(props: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState(0);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }

  return (
    <div className="clipPlayer">
      <audio
        ref={audioRef}
        src={props.src}
        preload="metadata"
        className="visuallyHidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setRatio(0);
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
          setRatio(audio.currentTime / audio.duration);
        }}
      />
      <button type="button" className="clipPlayer__play" aria-label={playing ? props.pauseLabel : props.playLabel} onClick={toggle}>
        <span className={playing ? "clipPlayer__pause" : "clipPlayer__triangle"} aria-hidden />
      </button>
      <input
        className="clipPlayer__range"
        type="range"
        min={0}
        max={1000}
        value={Math.round(ratio * 1000)}
        aria-label={props.progressLabel}
        onChange={(event) => {
          const audio = audioRef.current;
          const next = Number(event.target.value) / 1000;
          setRatio(next);
          if (audio && Number.isFinite(audio.duration)) audio.currentTime = next * audio.duration;
        }}
      />
    </div>
  );
}
