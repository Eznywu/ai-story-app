"use client";

import React from "react";

type Props = {
  hasStory: boolean;
  isSaving: boolean;
  isMakingMp3: boolean;
  isMakingPoster: boolean;
  isGenerating?: boolean;
  isSaved?: boolean;
  onPlay: () => void;
  onSave: () => void;
  onPoster: () => void;
  onRegenerate: () => void;
  onEditPrompt: () => void;
};

export function StoryResultActions({
  hasStory,
  isSaving,
  isMakingMp3,
  isMakingPoster,
  isGenerating = false,
  isSaved = false,
  onPlay,
  onSave,
  onPoster,
  onRegenerate,
  onEditPrompt,
}: Props) {
  if (!hasStory) return null;

  return (
    <section className="panel fadeEnter">
      <h2 className="panelTitle">Story result</h2>
      <p className="fieldHint">
        {isSaved
          ? "Saved in your library. Play keeps the narration with this story, and Create Poster attaches the cover."
          : "Generate a story to save it, then play it or make a cover."}
      </p>
      <div className="storyResultActions">
        <button
          className="button buttonPrimary"
          type="button"
          onClick={onPlay}
          disabled={isMakingMp3 || isSaving || isGenerating}
        >
          {isMakingMp3 ? "Preparing…" : "Play"}
        </button>
        <button className="button buttonPrimary" type="button" onClick={onSave} disabled={isSaving || isGenerating}>
          {isSaving ? "Saving…" : isSaved ? "Saved" : "Save"}
        </button>
        <button
          className="button buttonPrimary"
          type="button"
          onClick={onPoster}
          disabled={isMakingPoster || isSaving || isGenerating}
        >
          {isMakingPoster ? "Creating…" : "Create Poster"}
        </button>
      </div>
      <div className="storyResultActions storyResultActions--secondary">
        <button
          className="button"
          type="button"
          onClick={onRegenerate}
          disabled={isGenerating || isSaving || isMakingMp3 || isMakingPoster}
        >
          {isGenerating ? "Generating…" : "Regenerate"}
        </button>
        <button className="button" type="button" onClick={onEditPrompt}>
          Edit Prompt
        </button>
      </div>
    </section>
  );
}
