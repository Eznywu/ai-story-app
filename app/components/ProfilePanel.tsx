"use client";

import React, { useState } from "react";
import { QuietSheet } from "@/app/components/QuietSheet";
import { VoiceRecorder } from "@/app/components/VoiceRecorder";
import type { KidProfile, ReadingStatsState, StoryCharacterProfile } from "@/lib/profiles/profilesTypes";

type Props = {
  email?: string;
  language: string;
  stats: ReadingStatsState | null;
  kids: KidProfile[];
  characters: StoryCharacterProfile[];
  onAddKid: () => void;
  onAddCharacter: () => void;
  onCreateStory: () => void;
};

export function ProfilePanel({
  email,
  language,
  stats,
  kids,
  characters,
  onAddKid,
  onAddCharacter,
  onCreateStory,
}: Props) {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [hasClone, setHasClone] = useState(false);

  return (
    <section className="profilePanel" aria-labelledby="profile-heading">
      <h1 id="profile-heading" className="profilePanel__title">
        Profile
      </h1>
      <p className="profilePanel__lede">Children, characters, voices, and settings.</p>
      {email ? <p className="profilePanel__muted">Signed in as {email}</p> : null}

      <section className="profileGroup" aria-labelledby="profile-children">
        <div className="profileGroup__head">
          <h2 id="profile-children">Children</h2>
          <button type="button" className="profileGroup__add" onClick={onAddKid}>
            Add
          </button>
        </div>
        {kids.length === 0 ? <p className="profilePanel__muted">No children yet.</p> : null}
        <ul className="profileRows">
          {kids.map((kid) => (
            <li key={kid.id}>
              <button type="button" className="profileRow" onClick={onCreateStory}>
                <span className="profileRow__title">{kid.name}</span>
                <span className="profileRow__meta">{kid.age}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="profileGroup" aria-labelledby="profile-characters">
        <div className="profileGroup__head">
          <h2 id="profile-characters">Characters</h2>
          <button type="button" className="profileGroup__add" onClick={onAddCharacter}>
            Add
          </button>
        </div>
        {characters.length === 0 ? <p className="profilePanel__muted">No characters yet.</p> : null}
        <ul className="profileRows">
          {characters.map((character) => (
            <li key={character.id}>
              <button type="button" className="profileRow" onClick={onCreateStory}>
                <span className="profileRow__title">{character.name}</span>
                <span className="profileRow__meta">{character.characterType || "Story character"}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="profileGroup" aria-labelledby="profile-voices">
        <div className="profileGroup__head">
          <h2 id="profile-voices">Voices</h2>
        </div>
        <p className="profilePanel__muted">
          Standard narrators are ready for every story. A personal voice is optional and needs your consent when you
          record.
        </p>
        <ul className="profileRows">
          <li>
            <button type="button" className="profileRow" onClick={() => setVoiceOpen(true)}>
              <span className="profileRow__title">Personal voice</span>
              <span className="profileRow__meta">{hasClone ? "A sample is saved" : "Record if you want"}</span>
            </button>
          </li>
          <li>
            <button type="button" className="profileRow" onClick={onCreateStory}>
              <span className="profileRow__title">Choose a narrator</span>
              <span className="profileRow__meta">On the create screen</span>
            </button>
          </li>
        </ul>
      </section>

      <section className="profileGroup" aria-labelledby="profile-settings">
        <div className="profileGroup__head">
          <h2 id="profile-settings">Settings</h2>
        </div>
        {stats ? (
          <p className="profilePanel__muted">
            Opened today: {stats.storiesReadToday ?? 0}. Last story: {stats.lastStoryTitle?.trim() || "None yet"}.
          </p>
        ) : null}
        <ul className="profileRows">
          <li>
            <a className="profileRow" href="/settings">
              <span className="profileRow__title">Account and preferences</span>
              <span className="profileRow__meta">Settings</span>
            </a>
          </li>
          <li>
            <a className="profileRow" href="/legal/privacy">
              <span className="profileRow__title">Privacy</span>
            </a>
          </li>
          <li>
            <a className="profileRow" href="/legal/terms">
              <span className="profileRow__title">Terms</span>
            </a>
          </li>
        </ul>
      </section>

      {voiceOpen ? (
        <QuietSheet title="Personal voice" onClose={() => setVoiceOpen(false)}>
          <VoiceRecorder
            language={language}
            hasClone={hasClone}
            onCloned={() => setHasClone(true)}
            onClearClone={() => setHasClone(false)}
            onChooseNarrator={() => {
              setVoiceOpen(false);
              onCreateStory();
            }}
          />
        </QuietSheet>
      ) : null}
    </section>
  );
}
