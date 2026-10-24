"use client";

import React from "react";

type Props = {
  hasStory: boolean;
  isSaving: boolean;
  isMakingMp3: boolean;
  isMakingPoster: boolean;
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
      <p className="fieldHint">Choose the next step for this story.</p>
      <div className="storyResultActions">
        <button className="button buttonPrimary" type="button" onClick={onPlay} disabled={isMakingMp3}>
          {isMakingMp3 ? "Preparing…" : "Play"}
        </button>
        <button className="button buttonPrimary" type="button" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button className="button buttonPrimary" type="button" onClick={onPoster} disabled={isMakingPoster}>
          {isMakingPoster ? "Creating…" : "Create Poster"}
        </button>
      </div>
      <div className="storyResultActions storyResultActions--secondary">
        <button className="button" type="button" onClick={onRegenerate}>
          Regenerate
        </button>
        <button className="button" type="button" onClick={onEditPrompt}>
          Edit Prompt
        </button>
      </div>
    </section>
  );
}
