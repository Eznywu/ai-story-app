"use client";

import React from "react";

type Props = {
  story: string;
  isGenerating: boolean;
};

export function StoryOutput({ story, isGenerating }: Props) {
  return (
    <section className="panel">
      <h2 className="panelTitle">Story Output</h2>
      <div
        className={`storyBox${isGenerating ? " storyBoxLoading" : ""}`}
        aria-busy={isGenerating}
        aria-live="polite"
      >
        {isGenerating ? (
          <div className="loadingBlock">
            <span className="spinner" aria-hidden />
            <span className="loadingText">Generating your story…</span>
          </div>
        ) : story.trim() ? (
          story
        ) : (
          "(Your story will appear here)"
        )}
      </div>
    </section>
  );
}
