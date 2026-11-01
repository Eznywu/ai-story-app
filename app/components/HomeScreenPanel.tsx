"use client";

import React, { useMemo } from "react";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { StoryCover } from "@/app/components/StoryCover";
import { friendlyVoiceName } from "@/app/components/voiceLabel";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import type { VoiceItem } from "@/app/hooks/useTts";
import { readListenPosition, type ListenPosition } from "@/lib/audio/listenPosition";
import { fill } from "@/lib/i18n/locales";
import type { ReadingStatsState } from "@/lib/profiles/profilesTypes";

type Props = {
  library: StoryLibraryItem[];
  loadingLibrary: boolean;
  stats: ReadingStatsState | null;
  voices: VoiceItem[];
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

function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5l1.6 4.4L18 9.5l-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6L12 3.5zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg className="homePlay__glyph" viewBox="0 0 24 24" aria-hidden>
      <path d="M8 5.5v13a1 1 0 001.5.86l10.6-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" fill="currentColor" />
    </svg>
  );
}

/** Soft night scene for a family with no stories yet. Decorative; the text beside it says what to do. */
function EmptyIllustration() {
  return (
    <svg className="homeEmpty__art" viewBox="0 0 320 200" aria-hidden>
      <defs>
        <linearGradient id="hhEmptySky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9E2F7" />
          <stop offset="1" stopColor="#FBE7DA" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" rx="28" fill="url(#hhEmptySky)" />
      <circle cx="246" cy="58" r="24" fill="#FFF8EE" />
      <circle cx="257" cy="50" r="22" fill="#E9E2F7" />
      <g fill="#FFFFFF" opacity="0.9">
        <circle cx="62" cy="44" r="2.5" />
        <circle cx="104" cy="28" r="1.8" />
        <circle cx="186" cy="36" r="2.2" />
        <circle cx="292" cy="104" r="1.8" />
        <circle cx="30" cy="96" r="1.6" />
      </g>
      <path d="M0 150c48-26 98-30 150-14s104 18 170-8v72H0z" fill="#F6D3BF" />
      <path d="M0 168c62-18 120-16 176-2s96 14 144-2v36H0z" fill="#EFC3AC" />
      <g transform="translate(118 72)">
        <rect x="0" y="40" width="84" height="56" rx="10" fill="#FFF8EE" />
        <path d="M42 46v44" stroke="#E2CFC2" strokeWidth="3" strokeLinecap="round" />
        <path d="M10 54h22M10 64h22M52 54h22M52 64h18" stroke="#D8C7EC" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Home only renders in the browser (HomeApp waits for its gate), so device storage can be read here. */
function listenPositions(stories: StoryLibraryItem[]): Record<string, ListenPosition> {
  const found: Record<string, ListenPosition> = {};
  for (const story of stories) {
    if (!story.audioUrl) continue;
    const saved = readListenPosition(story.id, story.audioUrl);
    if (saved) found[story.id] = saved;
  }
  return found;
}

/**
 * Home `/` tab=home. Top: greeting and Create a story. Middle: the story to pick up, with large art and
 * Play or Continue. Then recent stories as illustrated cards. A new family sees an illustrated empty state.
 */
export function HomeScreenPanel({
  library,
  loadingLibrary,
  stats,
  voices,
  onOpenStory,
  onPlayStory,
  onSeeAll,
  onQuickCreate,
}: Props) {
  const { messages, formatClock } = useInterfaceLocale();
  const copy = messages.home;
  const sorted = useMemo(() => [...library].sort(byCreatedDesc), [library]);
  const positions = useMemo(() => listenPositions(sorted), [sorted]);
  const resumable = sorted.find((story) => positions[story.id]);
  const featured =
    sorted.find((story) => story.id === stats?.lastStoryId && positions[story.id]) ??
    resumable ??
    sorted.find((story) => story.id === stats?.lastStoryId) ??
    sorted[0] ??
    null;
  const others = sorted.filter((story) => story.id !== featured?.id).slice(0, 8);
  const progress = featured ? positions[featured.id] ?? null : null;
  const featuredTitle = featured?.title?.trim() || copy.untitled;
  const narrator = featured?.audioVoiceId ? voices.find((voice) => voice.id === featured.audioVoiceId) : null;
  const featuredMeta = featured
    ? [
        featured.mainCharacterName?.trim() ? fill(copy.forChild, { name: featured.mainCharacterName.trim() }) : "",
        narrator ? fill(copy.readBy, { name: friendlyVoiceName(narrator) }) : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const showEmpty = !loadingLibrary && !featured;

  return (
    <section className="homeScreen" aria-labelledby="home-screen-title">
      <header className="homeHero">
        <h1 id="home-screen-title" className="homeHero__title">
          {featured ? copy.pickup : copy.first}
        </h1>
        <p className="homeHero__sub">{copy.sub}</p>
      </header>

      {showEmpty ? null : (
        <button type="button" className="homeCreateCta" onClick={onQuickCreate}>
          <span className="homeCreateCta__icon" aria-hidden>
            <IconSpark className="homeCreateCta__spark" />
          </span>
          <span className="homeCreateCta__text">
            <span className="homeCreateCta__title">{copy.createCta}</span>
            <span className="homeCreateCta__sub">{copy.createCtaSub}</span>
          </span>
          <span className="homeCreateCta__chevron dirFlip" aria-hidden>
            ›
          </span>
        </button>
      )}

      {loadingLibrary && sorted.length === 0 ? (
        <div className="homeSkeleton" role="status" aria-live="polite">
          <span className="homeSkeleton__art" aria-hidden />
          <span className="homeSkeleton__line" aria-hidden />
          <span className="homeSkeleton__line homeSkeleton__line--short" aria-hidden />
          <span className="visuallyHidden">{copy.loading}</span>
        </div>
      ) : null}

      {showEmpty ? (
        <div className="homeEmpty">
          <EmptyIllustration />
          <h2 className="homeEmpty__title">{copy.emptyTitle}</h2>
          <p className="homeEmpty__body">{copy.emptyBody}</p>
          <button type="button" className="homePrimary homeEmpty__action" onClick={onQuickCreate}>
            <IconSpark className="homePrimary__icon" />
            {copy.makeFirst}
          </button>
        </div>
      ) : null}

      {featured ? (
        <article className="homeFeature" aria-labelledby="home-feature-title">
          <button
            type="button"
            className="homeFeature__open"
            onClick={() => onOpenStory(featured)}
            aria-label={fill(copy.openStory, { title: featuredTitle })}
          >
            <span className="homeFeature__art">
              <StoryCover
                coverUrl={featured.coverUrl}
                illustrationUrl={featured.illustrationUrl}
                posterUrl={featured.posterUrl}
                priority
              />
            </span>
            <span className="homeFeature__body">
              <span className="homeFeature__eyebrow">{progress ? copy.keepListening : copy.latest}</span>
              <span id="home-feature-title" className="homeFeature__title">
                {featuredTitle}
              </span>
              {featuredMeta ? <span className="homeFeature__meta">{featuredMeta}</span> : null}
              {progress ? (
                <span className="homeFeature__progress">
                  <span className="homeFeature__bar" aria-hidden>
                    <span style={{ width: `${Math.min(100, (progress.t / progress.d) * 100)}%` }} />
                  </span>
                  <span className="homeFeature__time">
                    {fill(copy.progress, { current: formatClock(progress.t), total: formatClock(progress.d) })}
                  </span>
                </span>
              ) : null}
            </span>
          </button>
          <div className="homeFeature__overlay">
            <button
              type="button"
              className="homePlay"
              onClick={() => onPlayStory(featured)}
              aria-label={fill(progress ? copy.continueStory : copy.playStory, { title: featuredTitle })}
            >
              <PlayGlyph />
              <span>{progress ? copy.continue : copy.play}</span>
            </button>
          </div>
        </article>
      ) : null}

      {others.length > 0 ? (
        <section className="homeRecent" aria-labelledby="recent-stories-heading">
          <div className="homeRecent__head">
            <h2 id="recent-stories-heading">{copy.recent}</h2>
            <button type="button" className="homeRecent__all" onClick={onSeeAll}>
              {copy.seeAll}
            </button>
          </div>
          <ul className="homeShelf">
            {others.map((story) => {
              const title = story.title?.trim() || copy.untitled;
              return (
                <li key={story.id} className="homeShelf__item">
                  <button type="button" className="homeCard" onClick={() => onOpenStory(story)}>
                    <span className="homeCard__art">
                      <StoryCover coverUrl={story.coverUrl} illustrationUrl={story.illustrationUrl} posterUrl={story.posterUrl} />
                    </span>
                    <span className="homeCard__title">{title}</span>
                    <span className="homeCard__meta">{story.mainCharacterName?.trim() || copy.story}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : featured ? (
        <div className="homeRecent__head homeRecent__head--solo">
          <span />
          <button type="button" className="homeRecent__all" onClick={onSeeAll}>
            {copy.seeAll}
          </button>
        </div>
      ) : null}
    </section>
  );
}
