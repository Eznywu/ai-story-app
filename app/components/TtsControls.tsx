"use client";

import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { fill } from "@/lib/i18n/locales";
import { clampTtsSpeed, TTS_SPEED_MAX, TTS_SPEED_MIN, TTS_SPEED_STEP } from "@/lib/tts/ttsLimits";

type Props = {
  speed: number;
  onSpeedChange: (value: number) => void;
};

export function TtsControls({ speed, onSpeedChange }: Props) {
  const { messages } = useInterfaceLocale();
  const copy = messages.reader;
  return (
    <section className="panel">
      <div className="controlsRow">
        <div className="controlBlock">
          <div className="label">{copy.narrationSpeed}</div>
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
            {fill(copy.speedHint, {
              min: TTS_SPEED_MIN.toFixed(2),
              max: TTS_SPEED_MAX.toFixed(2),
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
