"use client";

import React from "react";
import { clampTtsSpeed, TTS_SPEED_MAX, TTS_SPEED_MIN, TTS_SPEED_STEP } from "@/lib/tts/ttsLimits";

type Props = {
  speed: number;
  emotion: number;
  onSpeedChange: (value: number) => void;
  onEmotionChange: (value: number) => void;
};

function clampEmotion(n: number) {
  return Math.max(0, Math.min(100, n));
}

export function TtsControls({ speed, emotion, onSpeedChange, onEmotionChange }: Props) {
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
            ElevenLabs recording pace, {TTS_SPEED_MIN.toFixed(2)}–{TTS_SPEED_MAX.toFixed(2)}. 0.85–1.00 is a calm bedtime pace. This does not change the player speed.
          </p>
        </div>

        <div className="controlBlock">
          <div className="label">Emotion</div>
          <div className="stepper">
            <button type="button" className="button" onClick={() => onEmotionChange(clampEmotion(emotion - 5))}>
              -
            </button>
            <span className="stepperValue">Warm {emotion}%</span>
            <button type="button" className="button" onClick={() => onEmotionChange(clampEmotion(emotion + 5))}>
              +
            </button>
          </div>
          <p className="hint">
            Maps to ElevenLabs style and stability. Higher is more expressive. 30-55 is usually bedtime-safe.
          </p>
        </div>
      </div>
    </section>
  );
}
