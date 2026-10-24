"use client";

import React from "react";
import { STORY_AGE_OPTIONS, storyAgeIndex } from "@/lib/stories/storyAgeOptions";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Short label for the field, e.g. “Age” */
  label: string;
};

export function AgeRangeSlider({ id, value, onChange, label }: Props) {
  const max = STORY_AGE_OPTIONS.length - 1;
  const idx = storyAgeIndex(value);

  return (
    <div className="ageRangeSlider">
      <div className="ageRangeSlider__row">
        <label className="ageRangeSlider__label" htmlFor={id}>
          {label}
        </label>
        <span className="ageRangeSlider__output">{value}</span>
      </div>
      <div className="ageRangeSlider__track">
        <input
          id={id}
          type="range"
          className="ageRangeSlider__input"
          min={0}
          max={max}
          step={1}
          value={idx}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={idx}
          aria-valuetext={value}
          onChange={(e) => {
            const next = STORY_AGE_OPTIONS[Number(e.target.value)];
            if (next) onChange(next);
          }}
        />
        <div className="ageRangeSlider__ticks" aria-hidden>
          {STORY_AGE_OPTIONS.map((a) => (
            <span key={a} className="ageRangeSlider__tick">
              {a.replace(" months", " mo").replace(" year", " yr").replace(" years", " yrs")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
