"use client";

import React from "react";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profilesTypes";

type Props = {
  kids: KidProfile[];
  characters: StoryCharacterProfile[];
  onAddKid: () => void;
  onAddCharacter: () => void;
  onChooseKid: (k: KidProfile) => void;
  onChooseCharacter: (c: StoryCharacterProfile) => void;
  creationLocked: boolean;
  onGoToMembership: () => void;
};

export function CreateHubPanel({
  kids,
  characters,
  onAddKid,
  onAddCharacter,
  onChooseKid,
  onChooseCharacter,
  creationLocked,
  onGoToMembership,
}: Props) {
  return (
    <div className="createHub">
      {creationLocked ? (
        <div className="createHub__locked" role="status">
          Custom story generation is for members. You can still listen to the sample story from Home, or open Profile to
          log in and enter your membership code.
          <div className="createHub__lockedActions">
            <button type="button" className="button buttonPrimary" onClick={onGoToMembership}>
              Log in / membership
            </button>
          </div>
        </div>
      ) : null}
      <header className="createHub__intro">
        <h2 className="createHub__headline">Start a new story</h2>
        <p className="createHub__sub">
          Pick how you want to personalize: a real child you read to, or a fictional hero you invent.
        </p>
      </header>

      <section className="createHub__block" aria-labelledby="create-kid-heading">
        <h3 id="create-kid-heading" className="createHub__sectionTitle">
          Create with My Kid
        </h3>
        <p className="createHub__hint">Stories shaped around your child&apos;s name, age, and interests.</p>
        <div className="createHub__actionsRow">
          <button type="button" className="button buttonPrimary" onClick={onAddKid}>
            Add kid
          </button>
        </div>
        {kids.length === 0 ? (
          <p className="createHub__empty">No saved profiles yet. Tap Add kid to create one.</p>
        ) : (
          <ul className="createHub__list">
            {kids.map((k) => (
              <li key={k.id}>
                <button type="button" className="createHub__pick" onClick={() => onChooseKid(k)}>
                  <span className="createHub__pickName">{k.name}</span>
                  <span className="createHub__pickMeta">
                    {k.age} · {k.gender}
                    {k.interests.length ? ` · ${k.interests.slice(0, 3).join(", ")}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="createHub__block" aria-labelledby="create-char-heading">
        <h3 id="create-char-heading" className="createHub__sectionTitle">
          Create with a Story Character
        </h3>
        <p className="createHub__hint">Build an original main character and generate adventures around them.</p>
        <div className="createHub__actionsRow">
          <button type="button" className="button buttonPrimary" onClick={onAddCharacter}>
            Add character
          </button>
        </div>
        {characters.length === 0 ? (
          <p className="createHub__empty">No characters yet. Tap Add character to invent one.</p>
        ) : (
          <ul className="createHub__list">
            {characters.map((c) => (
              <li key={c.id}>
                <button type="button" className="createHub__pick" onClick={() => onChooseCharacter(c)}>
                  <span className="createHub__pickName">{c.name}</span>
                  <span className="createHub__pickMeta">
                    {c.characterType || "Character"} · {c.ageRange}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
