"use client";

import React, { useMemo } from "react";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import type { ReadingStatsState } from "@/lib/profiles/profilesTypes";

type Props = {
  library: StoryLibraryItem[];
  loadingLibrary: boolean;
  playBusy: boolean;
  stats: ReadingStatsState | null;
  onOpenStory: (item: StoryLibraryItem) => void;
  onPlayStory: (item: StoryLibraryItem) => void;
  onContinueReading: () => void;
  canContinueReading: boolean;
  onQuickCreate: () => void;
  onAddKid: () => void;
  onAddCharacter: () => void;
};

function byCreatedDesc(a: StoryLibraryItem, b: StoryLibraryItem): number {
  const ta = Date.parse(a.createdAt || "") || 0;
  const tb = Date.parse(b.createdAt || "") || 0;
  return tb - ta;
}

function formatDateLabel(createdAt: string): string {
  const ts = Date.parse(createdAt || "");
  if (!Number.isFinite(ts)) return "Recent";
  const days = Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return "Last week";
}

function genreGlyph(genre: string): string {
  const g = genre.toLowerCase();
  if (g.includes("bed") || g.includes("sleep")) return "🌙";
  if (g.includes("magic") || g.includes("fantasy")) return "✨";
  if (g.includes("friend")) return "❤";
  if (g.includes("adventure")) return "★";
  return "📖";
}

function BrandSparkIcon() {
  return (
    <svg className="homeHero__brandIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.8l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2 2-4.6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M18.8 3.2v2M17.8 4.2h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="figmaHome__playIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 7v10l8-5-8-5z" />
    </svg>
  );
}

export function HomeScreenPanel({
  library,
  loadingLibrary,
  playBusy,
  stats,
  onOpenStory,
  onPlayStory,
  onContinueReading,
  canContinueReading,
  onQuickCreate,
}: Props) {
  const sorted = useMemo(() => [...library].sort(byCreatedDesc), [library]);
  const recentStories = sorted.slice(0, 4);
  const readsToday = stats?.storiesReadToday ?? 0;

  return (
    <section className="homeScreen homeHero" aria-labelledby="home-screen-title">
      <header className="homeHero__header">
        <div className="homeHero__brand">
          <BrandSparkIcon />
          <span>DREAMWEAVER</span>
        </div>
        <h1 id="home-screen-title" className="homeHero__title">
          Every night,
          <br />a new adventure
        </h1>
        <p className="homeHero__subtitle">Personalized bedtime stories that bring magic to sleep</p>
      </header>

      <button type="button" className="homeHero__cta" onClick={onQuickCreate}>
        Create Tonight&apos;s Story
      </button>

      <section className="homeJourney" aria-labelledby="recent-stories-heading">
        <div className="homeJourney__head">
          <h2 id="recent-stories-heading" className="homeJourney__title">
            Continue Your Journey
          </h2>
          <button type="button" className="homeJourney__linkBtn" onClick={onContinueReading} disabled={!canContinueReading}>
            View All
          </button>
        </div>
        <p className="figmaHome__muted">{readsToday} stories read today</p>
        {loadingLibrary ? <p className="figmaHome__muted">Loading stories…</p> : null}
        {!loadingLibrary && recentStories.length === 0 ? (
          <p className="figmaHome__muted">No stories yet. Start by creating your first story.</p>
        ) : null}
        <div className="figmaHome__list">
          {recentStories.map((story) => (
            <article key={story.id} className="figmaHome__storyCard">
              <button
                type="button"
                className="figmaHome__storyMain"
                onClick={() => onOpenStory(story)}
                aria-label={`Open ${story.title?.trim() || "story"}`}
              >
                <span className="figmaHome__glyph" aria-hidden>
                  {genreGlyph(story.genre ?? "")}
                </span>
                <span className="figmaHome__storyText">
                  <span className="figmaHome__storyTitle">{story.title?.trim() || "Untitled Story"}</span>
                  <span className="figmaHome__storyMeta">
                    {story.mainCharacterName?.trim() || "Child"} · {formatDateLabel(story.createdAt || "")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="figmaHome__storyPlay"
                disabled={playBusy || !story.story.trim()}
                onClick={() => onPlayStory(story)}
                aria-label={`Play ${story.title?.trim() || "story"}`}
              >
                <PlayIcon />
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
