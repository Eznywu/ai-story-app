"use client";

import React, { useState } from "react";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";

type Props = {
  library: StoryLibraryItem[];
  loadingLibrary: boolean;
  libraryError: string;
  playBusy: boolean;
  onRefresh: () => void;
  onLoadStory: (story: StoryLibraryItem) => void;
  onPlayStory: (story: StoryLibraryItem) => void;
  onDismissLibraryError: () => void;
  panelTitle?: string;
};

function formatChildGenderLabel(value: string) {
  switch (value.toLowerCase()) {
    case "girl":
      return "Girl";
    case "boy":
      return "Boy";
    case "nonbinary":
      return "Non-binary";
    default:
      return value;
  }
}

export function LibraryPanel({
  library,
  loadingLibrary,
  libraryError,
  playBusy,
  onRefresh,
  onLoadStory,
  onPlayStory,
  onDismissLibraryError,
  panelTitle = "Library",
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleOpen(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <h2 className="panelTitle">{panelTitle}</h2>
        <button className="button" onClick={onRefresh} disabled={loadingLibrary} type="button">
          {loadingLibrary ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {libraryError ? (
        <div className="panelError" role="alert">
          <span className="panelErrorText">{libraryError}</span>
          <div className="panelErrorActions">
            <button className="button buttonPrimary" type="button" onClick={onRefresh} disabled={loadingLibrary}>
              Retry
            </button>
            <button className="button" type="button" onClick={onDismissLibraryError}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {!libraryError && library.length === 0 && !loadingLibrary ? (
        <div className="emptyState">No saved stories yet. Save a story to see it here.</div>
      ) : null}

      {library.length > 0 ? (
        <div className="libraryGrid">
          {library.slice(0, 20).map((story) => {
            const isOpen = openId === story.id;
            return (
              <div key={story.id} className={`libraryItemWrap${isOpen ? " libraryItemWrapOpen" : ""}`}>
                <button
                  type="button"
                  className="libraryItemHeader"
                  onClick={() => toggleOpen(story.id)}
                  aria-expanded={isOpen}
                  aria-controls={`library-body-${story.id}`}
                  id={`library-head-${story.id}`}
                >
                  <span className="libraryChevron" aria-hidden>
                    {isOpen ? "▼" : "▶"}
                  </span>
                  <span className="libraryHeaderText">
                    <span className="libraryTitle">
                      {story.title?.trim() ? story.title : "(Untitled)"}
                    </span>
                    <span className="libraryMeta">
                      {story.age ?? ""} - {story.genre ?? ""}
                      {story.childGender && story.childGender !== "any"
                        ? ` · ${formatChildGenderLabel(story.childGender)}`
                        : ""}
                      {story.posterUrl ? " · has poster" : ""}
                    </span>
                  </span>
                </button>

                {!isOpen ? (
                  <div className="libraryExcerptPreview">
                    {story.story.slice(0, 120)}
                    {story.story.length > 120 ? "…" : ""}
                  </div>
                ) : null}

                {isOpen ? (
                  <div
                    className="libraryItemOpen"
                    id={`library-body-${story.id}`}
                    role="region"
                    aria-labelledby={`library-head-${story.id}`}
                  >
                    <div className="libraryExcerptOpen">{story.story}</div>
                    <div className="libraryItemActions">
                      <button
                        className="button buttonPrimary"
                        type="button"
                        onClick={() => onLoadStory(story)}
                      >
                        Load story
                      </button>
                      <button
                        className="button"
                        type="button"
                        disabled={playBusy || !story.story.trim()}
                        onClick={() => onPlayStory(story)}
                      >
                        {playBusy ? "Preparing…" : "Play"}
                      </button>
                      {story.posterUrl ? (
                        <a
                          className="button"
                          href={story.posterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View poster
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {loadingLibrary && library.length === 0 ? (
        <div className="emptyState loadingBlock">
          <span className="spinner spinnerSmall" aria-hidden />
          <span>Loading library…</span>
        </div>
      ) : null}
    </section>
  );
}
