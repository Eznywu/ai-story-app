"use client";

import React from "react";

type Props = {
  theme: string;
  mood: string;
  seriesMode: "one_shot" | "series";
  educationalGoal: string;
  moralLesson: string;
  onThemeChange: (v: string) => void;
  onMoodChange: (v: string) => void;
  onSeriesModeChange: (v: "one_shot" | "series") => void;
  onEducationalGoalChange: (v: string) => void;
  onMoralLessonChange: (v: string) => void;
};

export function StorySetupExtras(props: Props) {
  return (
    <div className="storySetupExtras panel">
      <h2 className="panelTitle">Story setup</h2>
      <p className="storySetupExtras__lede">
        Tune genre and length in the fields below, then add tone and goals here.
      </p>
      <div className="fieldGrid">
        <label className="field">
          <span className="label">Theme focus</span>
          <input
            value={props.theme}
            onChange={(e) => props.onThemeChange(e.target.value)}
            placeholder="e.g. courage, sharing, trying new things"
          />
        </label>
        <label className="field">
          <span className="label">Mood</span>
          <input value={props.mood} onChange={(e) => props.onMoodChange(e.target.value)} placeholder="gentle, silly, dreamy…" />
        </label>
        <div className="field">
          <span className="label">Series</span>
          <div className="profileModal__segmented">
            <button
              type="button"
              className={`profileModal__seg${props.seriesMode === "one_shot" ? " profileModal__seg--on" : ""}`}
              onClick={() => props.onSeriesModeChange("one_shot")}
            >
              One-time
            </button>
            <button
              type="button"
              className={`profileModal__seg${props.seriesMode === "series" ? " profileModal__seg--on" : ""}`}
              onClick={() => props.onSeriesModeChange("series")}
            >
              Story series
            </button>
          </div>
        </div>
        <label className="field">
          <span className="label">Educational goal (optional)</span>
          <input
            value={props.educationalGoal}
            onChange={(e) => props.onEducationalGoalChange(e.target.value)}
            placeholder="e.g. counting, empathy"
          />
        </label>
        <label className="field">
          <span className="label">Moral / lesson (optional)</span>
          <input value={props.moralLesson} onChange={(e) => props.onMoralLessonChange(e.target.value)} placeholder="Keep it light" />
        </label>
      </div>
    </div>
  );
}
