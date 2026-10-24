"use client";

import React from "react";
import { AppStateCard } from "@/app/components/AppStateCard";

type Props = {
  story: string;
  isGenerating: boolean;
};

export function StoryOutput({ story, isGenerating }: Props) {
  if (isGenerating) {
    return (
      <section className="panel fadeEnter">
        <h2 className="panelTitle">Generating</h2>
        <AppStateCard
          title="Your bedtime story is being crafted"
          body="We are weaving your character, mood, and learning goals into a gentle adventure."
        />
      </section>
    );
  }

  return (
    <section className="panel">
      <h2 className="panelTitle">Story Output</h2>
      <div className="storyBox" aria-live="polite">
        {story.trim() ? story : "(Your story will appear here)"}
      </div>
    </section>
  );
}
