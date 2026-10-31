"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import { AppStateCard } from "@/app/components/AppStateCard";

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
  const x = length.toLowerCase();
  if (x === "short" || x === "medium" || x === "long") {
    return x.charAt(0).toUpperCase() + x.slice(1);
  }
  return length;
}

function libraryMetaLine(story: StoryLibraryItem): string {
  const author = story.mainCharacterName?.trim() ? story.mainCharacterName.trim() : "Story";
  const len = story.length ? formatLengthLabel(String(story.length)) : "";
  const genre = story.genre?.trim() || "";
  const parts = [author, genre, len].filter(Boolean);
  return parts.slice(0, 2).join(" · ");
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
  panelTitle = "Library",
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [detailItem, setDetailItem] = useState<StoryLibraryItem | null>(null);

  function toggleOpen(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  const filteredLibrary = useMemo(() => {
    if (filter === "all") return library;
    if (filter === "stories") return library.filter((s) => Boolean(s.story.trim()));
    if (filter === "posters") return library.filter((s) => Boolean(s.posterUrl));
    return library.filter((s) => Boolean(s.audioUrl));
  }, [filter, library]);

  return (
    <section className="panel fadeEnter">
      <div className="panelHeader">
        <h2 className="panelTitle">{panelTitle}</h2>
        <button className="button" onClick={onRefresh} disabled={loadingLibrary} type="button">
          {loadingLibrary ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="libraryFilters" role="tablist" aria-label="Library filter">
        {(
          [
            ["all", "All"],
            ["stories", "Stories"],
            ["posters", "Posters"],
            ["audio", "Audio"],
          ] as const
        ).map(([id, label]) => (
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
              Retry
            </button>
            <button className="button" type="button" onClick={onDismissLibraryError}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {!libraryError && filteredLibrary.length === 0 && !loadingLibrary ? (
        <AppStateCard
          title={filter === "audio" ? "No audio yet" : "No stories in this section"}
          body={
            filter === "audio"
              ? "Play a story to save narration. Stories with audio show up here."
              : filter === "posters"
                ? "Create a poster from a story and it will show up here."
                : "Save a story to start building your cozy shelf."
          }
        />
      ) : null}

      {filteredLibrary.length > 0 ? (
        <div className="libraryGrid">
          {filteredLibrary.slice(0, 20).map((story) => {
            const isOpen = openId === story.id;
            const meta = libraryMetaLine(story);
            return (
              <div key={story.id} className={`libraryItemWrap${isOpen ? " libraryItemWrapOpen" : ""}`}>
                <div className="libraryMediaRow">
                  <div className="libraryThumb" aria-hidden>
                    {story.posterUrl ? (
                      <Image
                        src={story.posterUrl}
                        alt=""
                        width={176}
                        height={216}
                        unoptimized
                        className="libraryThumb__img"
                      />
                    ) : (
                      <div className="libraryThumb__fallback" />
                    )}
                  </div>
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
                      {meta ? <span className="libraryMeta">{meta}</span> : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="button buttonPrimary libraryRowPlay"
                    disabled={playBusy || !story.story.trim()}
                    onClick={() => onPlayStory(story)}
                    aria-label={`Listen to ${story.title?.trim() || "story"}`}
                  >
                    {playBusy ? "…" : <span className="libraryRowPlayIcon" aria-hidden>▶</span>}
                  </button>
                </div>

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
                        Open
                      </button>
                      <button
                        className="button"
                        type="button"
                        disabled={playBusy || !story.story.trim()}
                        onClick={() => onPlayStory(story)}
                      >
                        {playBusy ? "Preparing…" : story.audioUrl ? "Listen" : "Make audio"}
                      </button>
                      <button className="button" type="button" onClick={() => setDetailItem(story)}>
                        Story detail
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
                      ) : onCreatePoster ? (
                        <button className="button" type="button" onClick={() => onCreatePoster(story)}>
                          Create poster
                        </button>
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

      {detailItem ? (
        <div className="profileModalBackdrop" role="presentation" onClick={() => setDetailItem(null)}>
          <div
            className="profileModal profileModal--wide libraryDetailModal"
            role="dialog"
            aria-labelledby="library-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profileModal__header">
              <h2 id="library-detail-title" className="profileModal__title">
                {detailItem.title?.trim() || "Untitled Story"}
              </h2>
              <button type="button" className="profileModal__close" onClick={() => setDetailItem(null)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="profilePanel__muted">{libraryMetaLine(detailItem)}</p>
            <div className="libraryExcerptOpen">{detailItem.story}</div>
            <div className="libraryItemActions">
              <button className="button buttonPrimary" type="button" onClick={() => onLoadStory(detailItem)}>
                Open
              </button>
              <button
                className="button"
                type="button"
                disabled={playBusy || !detailItem.story.trim()}
                onClick={() => onPlayStory(detailItem)}
              >
                Listen now
              </button>
              {onCreatePoster ? (
                <button className="button" type="button" onClick={() => onCreatePoster(detailItem)}>
                  Create poster
                </button>
              ) : null}
              {onDeleteStory ? (
                <button className="button" type="button" onClick={() => onDeleteStory(detailItem)}>
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
