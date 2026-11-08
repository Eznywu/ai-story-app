"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import { AppStateCard } from "@/app/components/AppStateCard";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { QuietSheet } from "@/app/components/QuietSheet";
import { StoryCover } from "@/app/components/StoryCover";
import { fill } from "@/lib/i18n/locales";

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

function libraryMetaLine(
  story: StoryLibraryItem,
  labels: { short: string; medium: string; long: string; audio: string; keepsake: string }
): string {
  const author = story.mainCharacterName?.trim() || "";
  const genre = story.genre?.trim() || "";
  const value = String(story.length || "").toLowerCase();
  const len = value === "short" ? labels.short : value === "medium" ? labels.medium : value === "long" ? labels.long : story.length ? String(story.length) : "";
  const media = [story.audioUrl ? labels.audio : "", story.posterUrl ? labels.keepsake : ""].filter(Boolean);
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
  panelTitle,
}: Props) {
  const { messages } = useInterfaceLocale();
  const copy = messages.library;
  const title = panelTitle || copy.title;
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
    ["all", copy.all],
    ["stories", copy.stories],
    ["audio", copy.audio],
    ["posters", copy.keepsakes],
  ] as const;

  return (
    <section className="storyShelf" aria-labelledby="library-heading">
      <div className="storyShelf__head">
        <h2 id="library-heading" className="storyShelf__title">
          {title}
        </h2>
        <button className="profileGroup__add" onClick={onRefresh} disabled={loadingLibrary} type="button">
          {loadingLibrary ? copy.refreshing : copy.refresh}
        </button>
      </div>

      <div className="libraryFilters" role="tablist" aria-label={copy.filterLabel}>
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
              {copy.tryAgain}
            </button>
            <button className="button" type="button" onClick={onDismissLibraryError}>
              {copy.dismiss}
            </button>
          </div>
        </div>
      ) : null}

      {!libraryError && filteredLibrary.length === 0 && !loadingLibrary ? (
        <AppStateCard
          title={filter === "audio" ? copy.noNarration : filter === "posters" ? copy.noKeepsakes : copy.nothing}
          body={
            filter === "audio"
              ? copy.noNarrationBody
              : filter === "posters"
                ? copy.noKeepsakesBody
                : copy.nothingBody
          }
        />
      ) : null}

      {filteredLibrary.length > 0 ? (
        <div className="storyGrid">
          {filteredLibrary.map((story) => {
            const title = story.title?.trim() || copy.untitled;
            return (
              <article key={story.id} className="storyCard">
                <button type="button" className="storyCard__open" onClick={() => onLoadStory(story)}>
                  <span className="storyCard__cover">
                    <StoryCover coverUrl={story.coverUrl} illustrationUrl={story.illustrationUrl} posterUrl={story.posterUrl} />
                  </span>
                  <span className="storyCard__title">{title}</span>
                  <span className="storyCard__meta">
                    {libraryMetaLine(story, {
                      short: messages.voice.lengthShort,
                      medium: messages.voice.lengthMedium,
                      long: messages.voice.lengthLong,
                      audio: copy.audio,
                      keepsake: copy.keepsake,
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  className="storyCard__menu"
                  aria-label={fill(copy.actions, { title })}
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
          <span>{copy.loading}</span>
        </div>
      ) : null}

      {menuItem ? (
        <QuietSheet title={menuItem.title?.trim() || copy.storyFallback} onClose={() => setMenuItem(null)} closeLabel={messages.common.close}>
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
            {menuItem.audioUrl ? copy.listen : copy.prepare}
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
              {copy.viewKeepsake}
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
              {copy.openKeepsake}
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
              {copy.deleteStory}
            </button>
          ) : null}
        </QuietSheet>
      ) : null}

      {pendingDelete ? (
        <QuietSheet title={copy.deleteTitle} closeLabel={messages.common.close} onClose={() => setPendingDelete(null)}>
          <p className="listenHint">
            {fill(copy.deleteBody, { title: pendingDelete.title?.trim() || copy.thisStory })}
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
            {copy.remove}
          </button>
          <button type="button" className="sheetAction" onClick={() => setPendingDelete(null)}>
            {copy.keep}
          </button>
        </QuietSheet>
      ) : null}

      {keepsake?.posterUrl ? (
        <QuietSheet title={copy.keepsake} closeLabel={messages.common.close} onClose={() => setKeepsake(null)}>
          <div className="keepsakeView">
            <Image src={keepsake.posterUrl} alt="" width={640} height={800} unoptimized className="keepsakeView__img" />
            <p className="listenHint">{keepsake.title?.trim() || copy.artwork}</p>
            <button
              type="button"
              className="sheetAction"
              onClick={() => {
                const item = keepsake;
                setKeepsake(null);
                onLoadStory(item);
              }}
            >
              {copy.openStory}
            </button>
          </div>
        </QuietSheet>
      ) : null}
    </section>
  );
}
