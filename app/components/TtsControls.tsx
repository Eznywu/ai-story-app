"use client";

import { clampTtsSpeed, TTS_SPEED_MAX, TTS_SPEED_MIN, TTS_SPEED_STEP } from "@/lib/tts/ttsLimits";

type Props = {
  speed: number;
  onSpeedChange: (value: number) => void;
};

export function TtsControls({ speed, onSpeedChange }: Props) {
  return (
    <section className="panel">
      <div className="controlsRow">
        <div className="controlBlock">
          <div className="label">Narration speed</div>
          <div className="stepper">
            <button
              type="button"
              className="button"
              onClick={() => onSpeedChange(clampTtsSpeed(speed - TTS_SPEED_STEP))}
            >
              -
            </button>
            <span className="stepperValue">{speed.toFixed(2)}x</span>
            <button
              type="button"
              className="button"
              onClick={() => onSpeedChange(clampTtsSpeed(speed + TTS_SPEED_STEP))}
            >
              +
            </button>
          </div>
          <p className="hint">
            Recording pace, {TTS_SPEED_MIN.toFixed(2)}–{TTS_SPEED_MAX.toFixed(2)}. This is separate from the playback speed on the story page. A calmer bedtime preset stays off until someone has listened and approved it.
          </p>
        </div>
      </div>
    </section>
  );
}
