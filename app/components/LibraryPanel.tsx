"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import { AppStateCard } from "@/app/components/AppStateCard";
import { QuietSheet } from "@/app/components/QuietSheet";

type Props = {
  library: StoryLibraryItem[];
  loadingLibrary: boolean;
  libraryError: string;
  playBusy: boolean;
  onRefresh: () => void;
  onLoadStory: (story: StoryLibraryItem) => void;
  onPlayStory: (story: StoryLibraryItem) => void;
  onDismissLibraryError: () => void;
  onDeleteStory?: (story: StoryLibraryItem) => void;
  onCreatePoster?: (story: StoryLibraryItem) => void;
  panelTitle?: string;
};

type LibraryFilter = "all" | "stories" | "posters" | "audio";

function formatLengthLabel(length: string): string {
  const value = length.toLowerCase();
  if (value === "short" || value === "medium" || value === "long") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return length;
}

function libraryMetaLine(story: StoryLibraryItem): string {
  const author = story.mainCharacterName?.trim() || "";
  const genre = story.genre?.trim() || "";
  const len = story.length ? formatLengthLabel(String(story.length)) : "";
  const media = [story.audioUrl ? "Audio" : "", story.posterUrl ? "Keepsake" : ""].filter(Boolean);
  return [author, genre, len, ...media].filter(Boolean).slice(0, 3).join(" · ");
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
  onDeleteStory,
  onCreatePoster,
  panelTitle = "My Stories",
}: Props) {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [menuItem, setMenuItem] = useState<StoryLibraryItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StoryLibraryItem | null>(null);
  const [keepsake, setKeepsake] = useState<StoryLibraryItem | null>(null);

  const filteredLibrary = useMemo(() => {
    if (filter === "all") return library;
    if (filter === "stories") return library.filter((story) => Boolean(story.story.trim()));
    if (filter === "posters") return library.filter((story) => Boolean(story.posterUrl || story.coverUrl));
    return library.filter((story) => Boolean(story.audioUrl));
  }, [filter, library]);

  const filters = [
    ["all", "All"],
    ["stories", "Stories"],
    ["audio", "Audio"],
    ["posters", "Keepsakes"],
  ] as const;

  return (
    <section className="storyShelf" aria-labelledby="library-heading">
      <div className="storyShelf__head">
        <h2 id="library-heading" className="storyShelf__title">
          {panelTitle}
        </h2>
        <button className="profileGroup__add" onClick={onRefresh} disabled={loadingLibrary} type="button">
          {loadingLibrary ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="libraryFilters" role="tablist" aria-label="Library filter">
        {filters.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`libraryFilterChip${filter === id ? " libraryFilterChip--active" : ""}`}
            onClick={() => setFilter(id)}
            role="tab"
            aria-selected={filter === id}
          >
            {label}
          </button>
        ))}
      </div>

      {libraryError ? (
        <div className="panelError" role="alert">
          <span className="panelErrorText">{libraryError}</span>
          <div className="panelErrorActions">
            <button className="button buttonPrimary" type="button" onClick={onRefresh} disabled={loadingLibrary}>
              Try again
            </button>
            <button className="button" type="button" onClick={onDismissLibraryError}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {!libraryError && filteredLibrary.length === 0 && !loadingLibrary ? (
        <AppStateCard
          title={filter === "audio" ? "No narration yet" : filter === "posters" ? "No keepsakes yet" : "Nothing here yet"}
          body={
            filter === "audio"
              ? "Prepare narration on a story and the recording will show up with it."
              : filter === "posters"
                ? "Cover artwork stays with its story. You can make a keepsake from the story page."
                : "Saved stories will gather here, with their audio and artwork."
          }
        />
      ) : null}

      {filteredLibrary.length > 0 ? (
        <div className="storyGrid">
          {filteredLibrary.map((story) => {
            const title = story.title?.trim() || "Untitled story";
            return (
              <article key={story.id} className="storyCard">
                <button type="button" className="storyCard__open" onClick={() => onLoadStory(story)}>
                  <span className="storyCard__cover">
                    {story.coverUrl || story.posterUrl ? (
                      <Image src={story.coverUrl || story.posterUrl || ""} alt="" width={320} height={320} unoptimized className="storyCard__img" />
                    ) : (
                      <span className="storyCard__fallback" aria-hidden />
                    )}
                  </span>
                  <span className="storyCard__title">{title}</span>
                  <span className="storyCard__meta">{libraryMetaLine(story)}</span>
                </button>
                <button
                  type="button"
                  className="storyCard__menu"
                  aria-label={`Actions for ${title}`}
                  aria-haspopup="dialog"
                  onClick={() => setMenuItem(story)}
                >
                  ···
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {loadingLibrary && library.length === 0 ? (
        <div className="emptyState loadingBlock">
          <span className="spinner spinnerSmall" aria-hidden />
          <span>Loading stories…</span>
        </div>
      ) : null}

      {menuItem ? (
        <QuietSheet title={menuItem.title?.trim() || "Story"} onClose={() => setMenuItem(null)}>
          <button
            type="button"
            className="sheetAction"
            disabled={playBusy || !menuItem.story.trim()}
            onClick={() => {
              const item = menuItem;
              setMenuItem(null);
              onPlayStory(item);
            }}
          >
            {menuItem.audioUrl ? "Listen" : "Prepare narration"}
          </button>
          {menuItem.posterUrl ? (
            <button
              type="button"
              className="sheetAction"
              onClick={() => {
                setKeepsake(menuItem);
                setMenuItem(null);
              }}
            >
              View keepsake
            </button>
          ) : onCreatePoster ? (
            <button
              type="button"
              className="sheetAction"
              onClick={() => {
                const item = menuItem;
                setMenuItem(null);
                onCreatePoster(item);
              }}
            >
              Open story for a keepsake
            </button>
          ) : null}
          {onDeleteStory ? (
            <button
              type="button"
              className="sheetAction sheetAction--danger"
              onClick={() => {
                setPendingDelete(menuItem);
                setMenuItem(null);
              }}
            >
              Delete story
            </button>
          ) : null}
        </QuietSheet>
      ) : null}

      {pendingDelete ? (
        <QuietSheet title="Delete this story?" onClose={() => setPendingDelete(null)}>
          <p className="listenHint">
            {pendingDelete.title?.trim() || "This story"} and its saved audio and artwork will be removed.
          </p>
          <button
            type="button"
            className="sheetAction sheetAction--danger"
            onClick={() => {
              const item = pendingDelete;
              setPendingDelete(null);
              onDeleteStory?.(item);
            }}
          >
            Delete
          </button>
          <button type="button" className="sheetAction" onClick={() => setPendingDelete(null)}>
            Keep it
          </button>
        </QuietSheet>
      ) : null}

      {keepsake?.posterUrl ? (
        <QuietSheet title="Keepsake" onClose={() => setKeepsake(null)}>
          <div className="keepsakeView">
            <Image src={keepsake.posterUrl} alt="" width={640} height={800} unoptimized className="keepsakeView__img" />
            <p className="listenHint">{keepsake.title?.trim() || "Story artwork"}</p>
            <button
              type="button"
              className="sheetAction"
              onClick={() => {
                const item = keepsake;
                setKeepsake(null);
                onLoadStory(item);
              }}
            >
              Open story
            </button>
          </div>
        </QuietSheet>
      ) : null}
    </section>
  );
}
