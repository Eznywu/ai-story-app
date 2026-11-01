"use client";

import React, { useState } from "react";
import type { StoryCharacterProfile } from "@/lib/profiles/profilesTypes";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";

const GENRE_OPTIONS = [
  "Animals",
  "Adventure",
  "Fantasy",
  "Friendship",
  "Magic",
  "Nature",
  "Space",
  "Underwater",
  "Holiday",
  "Fairy Tale",
  "Mystery",
  "Superhero",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (c: Omit<StoryCharacterProfile, "id">) => void;
};

export function CharacterFormModal({ open, onClose, onSave }: Props) {
  const { messages } = useInterfaceLocale();
  const copy = messages.character;
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("5–7");
  const [gender, setGender] = useState("any");
  const [characterType, setCharacterType] = useState("");
  const [personality, setPersonality] = useState("");
  const [skills, setSkills] = useState("");
  const [themes, setThemes] = useState<string[]>([]);
  const [visualStyle, setVisualStyle] = useState("");

  if (!open) return null;

  function toggleTheme(g: string) {
    setThemes((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function submit() {
    const n = name.trim();
    if (!n) return;
    onSave({
      name: n,
      ageRange,
      gender,
      characterType: characterType.trim(),
      personality: personality.trim(),
      skills: skills.trim(),
      themes,
      visualStyle: visualStyle.trim(),
    });
    setName("");
    setAgeRange("5–7");
    setGender("any");
    setCharacterType("");
    setPersonality("");
    setSkills("");
    setThemes([]);
    setVisualStyle("");
    onClose();
  }

  return (
    <div className="profileModalBackdrop" role="presentation" onClick={onClose}>
      <div
        className="profileModal profileModal--wide"
        role="dialog"
        aria-labelledby="char-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profileModal__header">
          <h2 id="char-form-title" className="profileModal__title">
            {copy.title}
          </h2>
          <button type="button" className="profileModal__close" onClick={onClose} aria-label={messages.common.close}>
            ×
          </button>
        </div>
        <div className="fieldGrid">
          <label className="field">
            <span className="label">{copy.name}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">{copy.ageRange}</span>
            <input value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder={copy.ageRangePlaceholder} />
          </label>
          <label className="field">
            <span className="label">{copy.gender}</span>
            <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder={copy.genderPlaceholder} />
          </label>
          <label className="field">
            <span className="label">{copy.kind}</span>
            <input
              value={characterType}
              onChange={(e) => setCharacterType(e.target.value)}
              placeholder={copy.kindPlaceholder}
            />
          </label>
          <label className="field">
            <span className="label">{copy.personality}</span>
            <input value={personality} onChange={(e) => setPersonality(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">{copy.skills}</span>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} />
          </label>
          <div className="field">
            <span className="label">{copy.themes}</span>
            <div className="profileModal__tags">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`profileModal__tag${themes.includes(g) ? " profileModal__tag--on" : ""}`}
                  onClick={() => toggleTheme(g)}
                >
                  {messages.voice.genres[g as keyof typeof messages.voice.genres] || g}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="label">{copy.look}</span>
            <input
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value)}
              placeholder={copy.lookPlaceholder}
            />
          </label>
        </div>
        <div className="profileModal__actions">
          <button type="button" className="button" onClick={onClose}>
            {copy.cancel}
          </button>
          <button type="button" className="button buttonPrimary" onClick={submit} disabled={!name.trim()}>
            {copy.save}
          </button>
        </div>
      </div>
    </div>
  );
}
