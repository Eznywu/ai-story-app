"use client";

import React, { useState } from "react";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { QuietSheet } from "@/app/components/QuietSheet";
import { fill } from "@/lib/i18n/locales";
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
  const { messages, formatNumber } = useInterfaceLocale();
  const copy = messages.profile;
  const [voiceOpen, setVoiceOpen] = useState(false);
  const storyLanguageLabel = language.toLowerCase().startsWith("zh") ? messages.voice.chinese : messages.voice.english;

  return (
    <section className="profilePanel" aria-labelledby="profile-heading">
      <h1 id="profile-heading" className="profilePanel__title">
        {copy.title}
      </h1>
      <p className="profilePanel__lede">{copy.lede}</p>
      {email ? <p className="profilePanel__muted">{fill(copy.signedIn, { email })}</p> : null}

      <section className="profileGroup" aria-labelledby="profile-children">
        <div className="profileGroup__head">
          <h2 id="profile-children">{copy.children}</h2>
          <button type="button" className="profileGroup__add" onClick={onAddKid}>
            {copy.add}
          </button>
        </div>
        {kids.length === 0 ? <p className="profilePanel__muted">{copy.noChildren}</p> : null}
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
          <h2 id="profile-characters">{copy.characters}</h2>
          <button type="button" className="profileGroup__add" onClick={onAddCharacter}>
            {copy.add}
          </button>
        </div>
        {characters.length === 0 ? <p className="profilePanel__muted">{copy.noCharacters}</p> : null}
        <ul className="profileRows">
          {characters.map((character) => (
            <li key={character.id}>
              <button type="button" className="profileRow" onClick={onCreateStory}>
                <span className="profileRow__title">{character.name}</span>
                <span className="profileRow__meta">{character.characterType || copy.storyCharacter}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="profileGroup" aria-labelledby="profile-voices">
        <div className="profileGroup__head">
          <h2 id="profile-voices">{copy.voices}</h2>
        </div>
        <p className="profilePanel__muted">{copy.voicesBody}</p>
        <ul className="profileRows">
          <li>
            <button type="button" className="profileRow" onClick={() => setVoiceOpen(true)}>
              <span className="profileRow__title">{copy.addVoice}</span>
              <span className="profileRow__meta">{copy.addVoiceMeta}</span>
            </button>
          </li>
          <li>
            <button type="button" className="profileRow" onClick={onCreateStory}>
              <span className="profileRow__title">{copy.chooseNarrator}</span>
              <span className="profileRow__meta">{copy.chooseMeta}</span>
            </button>
          </li>
        </ul>
      </section>

      <section className="profileGroup" aria-labelledby="profile-settings">
        <div className="profileGroup__head">
          <h2 id="profile-settings">{copy.settings}</h2>
        </div>
        {stats ? (
          <p className="profilePanel__muted">
            {fill(copy.opened, {
              count: formatNumber(stats.storiesReadToday ?? 0),
              title: stats.lastStoryTitle?.trim() || copy.noneYet,
            })}
          </p>
        ) : null}
        <ul className="profileRows">
          <li>
            <a className="profileRow" href="/settings">
              <span className="profileRow__title">{copy.account}</span>
              <span className="profileRow__meta">{copy.settingsMeta}</span>
            </a>
          </li>
          <li>
            <a className="profileRow" href="/legal/privacy">
              <span className="profileRow__title">{copy.privacy}</span>
            </a>
          </li>
          <li>
            <a className="profileRow" href="/legal/terms">
              <span className="profileRow__title">{copy.terms}</span>
            </a>
          </li>
        </ul>
      </section>

      {voiceOpen ? (
        <QuietSheet title={copy.voiceSheetTitle} closeLabel={messages.common.close} onClose={() => setVoiceOpen(false)}>
          <p className="profilePanel__muted">{fill(copy.voiceSheetBody, { language: storyLanguageLabel })}</p>
          <button
            type="button"
            className="createScreen__submit"
            onClick={() => {
              setVoiceOpen(false);
              onCreateStory();
            }}
          >
            {copy.openCreate}
          </button>
        </QuietSheet>
      ) : null}
    </section>
  );
}
