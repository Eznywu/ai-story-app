"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import type { ReadingStatsState } from "@/lib/profilesTypes";

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
  member: boolean;
  onPlaySampleStory: () => void;
  onGoToMembership: () => void;
};

function byCreatedDesc(a: StoryLibraryItem, b: StoryLibraryItem): number {
  const ta = Date.parse(a.createdAt || "") || 0;
  const tb = Date.parse(b.createdAt || "") || 0;
  return tb - ta;
}

function coverGradient(genre: string): string {
  const g = genre.toLowerCase();
  if (g.includes("animal")) return "linear-gradient(160deg, #5c4a3d 0%, #8b6f52 45%, #3d2f28 100%)";
  if (g.includes("fantasy") || g.includes("magic")) return "linear-gradient(160deg, #3d2d52 0%, #6b5090 50%, #241830 100%)";
  if (g.includes("ocean") || g.includes("sea")) return "linear-gradient(160deg, #1e3a4a 0%, #3d7a9c 50%, #0f2430 100%)";
  return "linear-gradient(155deg, var(--logo-purple-mid) 0%, var(--logo-purple) 50%, var(--logo-purple-deep) 100%)";
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
  onAddKid,
  onAddCharacter,
  member,
  onPlaySampleStory,
  onGoToMembership,
}: Props) {
  const sorted = useMemo(() => [...library].sort(byCreatedDesc), [library]);
  const newReleases = sorted.slice(0, 8);
  const topTen = sorted.slice(0, 10);

  const readsToday = stats?.storiesReadToday ?? 0;
  const streak = stats?.streakDays ?? 0;
  const draft = stats?.draftSummary;

  return (
    <section className="homeScreen" aria-labelledby="home-screen-title">
      <h1 id="home-screen-title" className="homeScreen__titleStandalone">
        Home
      </h1>

      <div className="homeScreen__journey cardLift">
        <h2 className="homeScreen__journeyTitle">User journey</h2>
        <div className="homeScreen__journeyGrid">
          <div className="homeScreen__stat">
            <span className="homeScreen__statValue">{readsToday}</span>
            <span className="homeScreen__statLabel">Stories read today</span>
          </div>
          <div className="homeScreen__stat">
            <span className="homeScreen__statValue">{streak}</span>
            <span className="homeScreen__statLabel">Day streak</span>
          </div>
        </div>
        <p className="homeScreen__journeyLine">
          <strong>Continue:</strong>{" "}
          {canContinueReading ? "Pick up your last story below." : "Save a story to unlock Continue Reading."}
        </p>
        {draft ? (
          <p className="homeScreen__journeyLine">
            <strong>Creation:</strong> {draft}
          </p>
        ) : (
          <p className="homeScreen__journeyLine">
            <strong>Creation:</strong> No draft in progress — start from Create.
          </p>
        )}
      </div>

      <div className="homeScreen__quick">
        <h2 className="homeScreen__sectionHeading">Quick actions</h2>
        <div className="homeScreen__quickGrid">
          {member ? (
            <button type="button" className="homeScreen__qa button buttonPrimary" onClick={onQuickCreate}>
              Create New Story
            </button>
          ) : (
            <>
              <button type="button" className="homeScreen__qa button buttonPrimary" onClick={onPlaySampleStory}>
                Play sample story
              </button>
              <button type="button" className="homeScreen__qa button" onClick={onGoToMembership}>
                Log in / join membership
              </button>
            </>
          )}
          <button type="button" className="homeScreen__qa button" onClick={onAddKid}>
            Add Kid Profile
          </button>
          <button type="button" className="homeScreen__qa button" onClick={onAddCharacter}>
            Add Character
          </button>
          <button type="button" className="homeScreen__qa button" onClick={onContinueReading} disabled={!canContinueReading}>
            Continue Reading
          </button>
        </div>
      </div>

      <div className="esStoryHome__section">
        <h2 className="esStoryHome__sectionHeading">New Release</h2>
        <div className="esStoryHome__rule" aria-hidden />
        {loadingLibrary ? (
          <p className="esStoryHome__muted">Loading…</p>
        ) : newReleases.length === 0 ? (
          <p className="esStoryHome__muted">No saved stories yet — create one from the Create tab.</p>
        ) : (
          <div className="esStoryHome__scroll">
            {newReleases.map((item) => (
              <article key={item.id} className="esStoryHome__releaseCard">
                <button
                  type="button"
                  className="esStoryHome__releaseCover"
                  onClick={() => onOpenStory(item)}
                  aria-label={`Open ${item.title?.trim() || "story"}`}
                >
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt=""
                      width={160}
                      height={200}
                      className="esStoryHome__releaseImg"
                      sizes="160px"
                    />
                  ) : (
                    <div
                      className="esStoryHome__releaseFallback"
                      style={{ background: coverGradient(item.genre ?? "") }}
                      aria-hidden
                    />
                  )}
                </button>
                <p className="esStoryHome__releaseTitle">
                  {item.title?.trim() ? item.title : "Untitled"}
                </p>
                <button
                  type="button"
                  className="button buttonPrimary esStoryHome__playBtn"
                  disabled={playBusy || !item.story.trim()}
                  onClick={() => onPlayStory(item)}
                >
                  {playBusy ? "…" : "Play"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="esStoryHome__section">
        <h2 className="esStoryHome__sectionHeading">This Week Top 10</h2>
        <div className="esStoryHome__rule" aria-hidden />
        {loadingLibrary ? (
          <p className="esStoryHome__muted">Loading…</p>
        ) : topTen.length === 0 ? (
          <p className="esStoryHome__muted">Your top stories will show here after you save a few.</p>
        ) : (
          <ol className="esStoryHome__topList">
            {topTen.map((item, index) => (
              <li key={item.id} className="esStoryHome__topRow">
                <span className="esStoryHome__topRank">{index + 1}</span>
                <button type="button" className="esStoryHome__topTitleBtn" onClick={() => onOpenStory(item)}>
                  {item.title?.trim() ? item.title : "Untitled"}
                </button>
                <button
                  type="button"
                  className="button esStoryHome__topPlay"
                  disabled={playBusy || !item.story.trim()}
                  onClick={() => onPlayStory(item)}
                  aria-label={`Play ${item.title?.trim() || "story"}`}
                >
                  {playBusy ? "…" : "▶"}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
