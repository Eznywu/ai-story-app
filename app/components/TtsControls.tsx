"use client";

import React from "react";

type Props = {
  speed: number;
  emotion: number;
  onSpeedChange: (value: number) => void;
  onEmotionChange: (value: number) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function TtsControls({ speed, emotion, onSpeedChange, onEmotionChange }: Props) {
  return (
    <section className="panel">
      <div className="controlsRow">
        <div className="controlBlock">
          <div className="label">Speed</div>
          <div className="stepper">
            <button type="button" className="button" onClick={() => onSpeedChange(Number(clamp(speed - 0.05, 0.6, 1.3).toFixed(2)))}>
              -
            </button>
            <span className="stepperValue">{speed.toFixed(2)}x</span>
            <button type="button" className="button" onClick={() => onSpeedChange(Number(clamp(speed + 0.05, 0.6, 1.3).toFixed(2)))}>
              +
            </button>
          </div>
          <p className="hint">Tip: 0.85-1.00 feels like a calm bedtime pace.</p>
        </div>

        <div className="controlBlock">
          <div className="label">Emotion</div>
          <div className="stepper">
            <button type="button" className="button" onClick={() => onEmotionChange(clamp(emotion - 5, 0, 100))}>
              -
            </button>
            <span className="stepperValue">Warm {emotion}%</span>
            <button type="button" className="button" onClick={() => onEmotionChange(clamp(emotion + 5, 0, 100))}>
              +
            </button>
          </div>
          <p className="hint">Higher values are more expressive. 30-55 is usually bedtime-safe.</p>
        </div>
      </div>
    </section>
  );
}
