"use client";

import React, { useMemo, useState } from "react";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import type { ReadingStatsState } from "@/lib/profiles/profilesTypes";

type Props = {
  library: StoryLibraryItem[];
  loadingLibrary: boolean;
  stats: ReadingStatsState | null;
  onOpenStory: (item: StoryLibraryItem) => void;
  onPlayStory: (item: StoryLibraryItem) => void;
  onSeeAll: () => void;
  onQuickCreate: () => void;
};

function byCreatedDesc(a: StoryLibraryItem, b: StoryLibraryItem): number {
  const ta = Date.parse(a.createdAt || "") || 0;
  const tb = Date.parse(b.createdAt || "") || 0;
  return tb - ta;
}

function CoverThumb({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="homeFeature__cover" aria-hidden>
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" onError={() => setBroken(true)} />
      ) : (
        <span className="homeFeature__fallback" />
      )}
    </span>
  );
}

function formatClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

function savedListen(id: string): { t: number; d: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`happy-horse.playback.${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t?: number; d?: number };
    if (typeof parsed.t !== "number" || typeof parsed.d !== "number") return null;
    if (!(parsed.d > 30) || parsed.t < 5 || parsed.t > parsed.d - 5) return null;
    return { t: parsed.t, d: parsed.d };
  } catch {
    return null;
  }
}

export function HomeScreenPanel({
  library,
  loadingLibrary,
  stats,
  onOpenStory,
  onPlayStory,
  onSeeAll,
  onQuickCreate,
}: Props) {
  const sorted = useMemo(() => [...library].sort(byCreatedDesc), [library]);
  const featured =
    sorted.find((story) => story.id === stats?.lastStoryId) ?? sorted[0] ?? null;
  const others = sorted.filter((story) => story.id !== featured?.id).slice(0, 3);
  const progress = featured ? savedListen(featured.id) : null;

  return (
    <section className="homeScreen" aria-labelledby="home-screen-title">
      <header className="homeScreen__head">
        <h1 id="home-screen-title" className="homeScreen__title">
          {featured ? "Pick up the story" : "Your first story"}
        </h1>
        <p className="homeScreen__sub">A quiet place to listen again, or to begin.</p>
      </header>

      {loadingLibrary && sorted.length === 0 ? <p className="homeScreen__note">Loading stories…</p> : null}

      {!loadingLibrary && !featured ? (
        <div className="homeEmpty">
          <p>No stories yet. When you create one, it will wait here.</p>
          <button type="button" className="button buttonPrimary" onClick={onQuickCreate}>
            Make your first story
          </button>
        </div>
      ) : null}

      {featured ? (
        <article className="homeFeature">
          <button type="button" className="homeFeature__main" onClick={() => onOpenStory(featured)}>
            <CoverThumb url={featured.coverUrl || featured.posterUrl || null} />
            <span className="homeFeature__text">
              <span className="homeFeature__title">{featured.title?.trim() || "Untitled story"}</span>
              <span className="homeFeature__meta">
                {featured.mainCharacterName?.trim() || "Your story"}
                {progress ? ` · ${formatClock(progress.t)} of ${formatClock(progress.d)}` : ""}
              </span>
            </span>
          </button>
          <button type="button" className="button buttonPrimary homeFeature__action" onClick={() => onPlayStory(featured)}>
            {progress ? "Continue" : "Listen again"}
          </button>
        </article>
      ) : null}

      {others.length > 0 ? (
        <section className="homeRecent" aria-labelledby="recent-stories-heading">
          <div className="homeRecent__head">
            <h2 id="recent-stories-heading">Recent stories</h2>
            <button type="button" className="homeRecent__all" onClick={onSeeAll}>
              See all
            </button>
          </div>
          <ul className="homeRecent__list">
            {others.map((story) => (
              <li key={story.id}>
                <button type="button" className="homeRecent__row" onClick={() => onOpenStory(story)}>
                  <span className="homeRecent__title">{story.title?.trim() || "Untitled story"}</span>
                  <span className="homeRecent__meta">{story.mainCharacterName?.trim() || "Story"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : featured ? (
        <div className="homeRecent__head">
          <span />
          <button type="button" className="homeRecent__all" onClick={onSeeAll}>
            See all
          </button>
        </div>
      ) : null}

      <button type="button" className="homeCreate" onClick={onQuickCreate}>
        <span>Create a new story</span>
        <span aria-hidden>›</span>
      </button>
    </section>
  );
}
