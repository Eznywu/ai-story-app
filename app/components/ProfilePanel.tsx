"use client";

import React from "react";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profiles/profilesTypes";
import type { ReadingStatsState } from "@/lib/profiles/profilesTypes";

type Props = {
  stats: ReadingStatsState | null;
  kids: KidProfile[];
  characters: StoryCharacterProfile[];
  onGoToCreateHub: () => void;
};

export function ProfilePanel({ stats, kids, characters, onGoToCreateHub }: Props) {
  return (
    <section className="profilePanel fadeEnter" aria-labelledby="profile-heading">
      <h1 id="profile-heading" className="profilePanel__title">
        Family Profile
      </h1>
      <p className="profilePanel__lede">Your reading companion settings and saved story profiles.</p>

      <div className="profilePanel__card">
        <h2 className="profilePanel__h2">Reading snapshot</h2>
        <p className="profilePanel__statLine">
          <strong>{stats?.storiesReadToday ?? 0}</strong> reads today · <strong>{stats?.streakDays ?? 0}</strong> day streak
        </p>
        <p className="profilePanel__muted">Last story: {stats?.lastStoryTitle?.trim() || "None yet"}</p>
      </div>

      <div className="profilePanel__card">
        <h2 className="profilePanel__h2">Kid profiles</h2>
        {kids.length === 0 ? (
          <p className="profilePanel__muted">None yet.</p>
        ) : (
          <ul className="profilePanel__list">
            {kids.map((k) => (
              <li key={k.id}>
                {k.name} · {k.age}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="button buttonPrimary profilePanel__btn" onClick={onGoToCreateHub}>
          Create with This Profile
        </button>
      </div>

      <div className="profilePanel__card">
        <h2 className="profilePanel__h2">Story characters</h2>
        {characters.length === 0 ? (
          <p className="profilePanel__muted">None yet.</p>
        ) : (
          <ul className="profilePanel__list">
            {characters.map((c) => (
              <li key={c.id}>
                {c.name}
                {c.characterType ? ` · ${c.characterType}` : ""}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="button buttonPrimary profilePanel__btn" onClick={onGoToCreateHub}>
          Use in Story
        </button>
      </div>

      <div className="profilePanel__card">
        <h2 className="profilePanel__h2">Settings, legal, support</h2>
        <ul className="profilePanel__links">
          <li>
            <a href="/settings">Settings</a>
          </li>
          <li>
            <a href="/legal/privacy">Privacy Policy</a>
          </li>
          <li>
            <a href="/legal/terms">Terms of Use</a>
          </li>
        </ul>
      </div>
    </section>
  );
}
