"use client";

import React from "react";
import Link from "next/link";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profilesTypes";
import type { ReadingStatsState } from "@/lib/profilesTypes";
import { MembershipCard } from "@/app/components/MembershipCard";

type Props = {
  stats: ReadingStatsState | null;
  kids: KidProfile[];
  characters: StoryCharacterProfile[];
  onGoToCreateHub: () => void;
  authLoading: boolean;
  loggedIn: boolean;
  member: boolean;
  email: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onJoinMembership: (code: string) => Promise<void>;
};

export function ProfilePanel({
  stats,
  kids,
  characters,
  onGoToCreateHub,
  authLoading,
  loggedIn,
  member,
  email,
  onLogin,
  onLogout,
  onJoinMembership,
}: Props) {
  return (
    <section className="profilePanel" aria-labelledby="profile-heading">
      <h1 id="profile-heading" className="profilePanel__title">
        Profile
      </h1>
      <p className="profilePanel__lede">Parent tools, saved profiles, and app settings.</p>

      <MembershipCard
        loading={authLoading}
        loggedIn={loggedIn}
        member={member}
        email={email}
        onLogin={onLogin}
        onLogout={onLogout}
        onJoinMembership={onJoinMembership}
      />

      <div className="profilePanel__card">
        <h2 className="profilePanel__h2">Reading snapshot</h2>
        <p className="profilePanel__statLine">
          <strong>{stats?.storiesReadToday ?? 0}</strong> reads today · <strong>{stats?.streakDays ?? 0}</strong> day streak
        </p>
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
          Manage in Create
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
          Manage in Create
        </button>
      </div>

      <div className="profilePanel__card">
        <h2 className="profilePanel__h2">Settings</h2>
        <ul className="profilePanel__links">
          <li>
            <Link href="/settings">App &amp; legal</Link>
          </li>
          <li>
            <Link href="/legal/privacy">Privacy</Link>
          </li>
          <li>
            <Link href="/legal/terms">Terms</Link>
          </li>
        </ul>
        <p className="profilePanel__muted">Notifications coming soon.</p>
      </div>
    </section>
  );
}
