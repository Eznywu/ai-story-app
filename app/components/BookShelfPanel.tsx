"use client";

import React from "react";
import Image from "next/image";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";

type Props = {
  library: StoryLibraryItem[];
  loadingLibrary: boolean;
  libraryError: string;
  playBusy: boolean;
  onRefresh: () => void;
  onOpenInEditor: (story: StoryLibraryItem) => void;
  onPlayStory: (story: StoryLibraryItem) => void;
  onDismissLibraryError: () => void;
};

function shelfAccent(genre: string): string {
  const g = genre.toLowerCase();
  if (g.includes("animal")) return "linear-gradient(160deg, #5c4a3d 0%, #8b6f52 45%, #3d2f28 100%)";
  if (g.includes("fantasy") || g.includes("magic")) return "linear-gradient(160deg, #3d2d52 0%, #6b5090 50%, #241830 100%)";
  if (g.includes("ocean") || g.includes("sea")) return "linear-gradient(160deg, #1e3a4a 0%, #3d7a9c 50%, #0f2430 100%)";
  return "linear-gradient(160deg, #4a3d52 0%, #7a6282 45%, #2d2533 100%)";
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function BookShelfPanel({
  library,
  loadingLibrary,
  libraryError,
  playBusy,
  onRefresh,
  onOpenInEditor,
  onPlayStory,
  onDismissLibraryError,
}: Props) {
  const rows = chunk(library.slice(0, 40), 4);

  return (
    <section className="panel bookShelfPanel">
      <div className="panelHeader">
        <h2 className="panelTitle">BookShelf</h2>
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
        <div className="emptyState">Your shelf is empty. Create a story and save it to see books here.</div>
      ) : null}

      {library.length > 0 ? (
        <div className="bookShelfShelves">
          {rows.map((row, ri) => (
            <div className="bookShelfRow" key={`shelf-${ri}`}>
              <div className="bookShelfBooks">
                {row.map((story) => {
                  const label = story.title?.trim() ? story.title : "(Untitled)";
                  return (
                    <div className="bookCardWrap" key={story.id}>
                      <button type="button" className="bookCard" onClick={() => onOpenInEditor(story)}>
                        <span className="bookCardCover">
                          {story.posterUrl ? (
                            <Image
                              src={story.posterUrl}
                              alt=""
                              width={200}
                              height={280}
                              className="bookCardImage"
                              sizes="(max-width: 480px) 25vw, 120px"
                            />
                          ) : (
                            <span className="bookCardFallback" style={{ background: shelfAccent(story.genre ?? "") }} />
                          )}
                        </span>
                        <span className="bookCardTitle">{label}</span>
                      </button>
                      <button
                        type="button"
                        className="button buttonPrimary bookCardPlay"
                        disabled={playBusy || !story.story.trim()}
                        onClick={() => onPlayStory(story)}
                      >
                        {playBusy ? "…" : "Play"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="bookShelfLedge" aria-hidden />
            </div>
          ))}
        </div>
      ) : null}

      {loadingLibrary && library.length === 0 ? (
        <div className="emptyState loadingBlock">
          <span className="spinner spinnerSmall" aria-hidden />
          <span>Loading your shelf…</span>
        </div>
      ) : null}
    </section>
  );
}
