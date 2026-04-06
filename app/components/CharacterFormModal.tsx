"use client";

import React, { useState } from "react";
import type { StoryCharacterProfile } from "@/lib/profilesTypes";

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
            Add story character
          </h2>
          <button type="button" className="profileModal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="fieldGrid">
          <label className="field">
            <span className="label">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Age range</span>
            <input value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="e.g. 4–6" />
          </label>
          <label className="field">
            <span className="label">Gender</span>
            <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="girl, boy, any…" />
          </label>
          <label className="field">
            <span className="label">Character type</span>
            <input
              value={characterType}
              onChange={(e) => setCharacterType(e.target.value)}
              placeholder="e.g. curious fox, space explorer"
            />
          </label>
          <label className="field">
            <span className="label">Personality</span>
            <input value={personality} onChange={(e) => setPersonality(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Special skills / powers</span>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} />
          </label>
          <div className="field">
            <span className="label">Favorite themes</span>
            <div className="profileModal__tags">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`profileModal__tag${themes.includes(g) ? " profileModal__tag--on" : ""}`}
                  onClick={() => toggleTheme(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="label">Visual style reference</span>
            <input
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value)}
              placeholder="e.g. soft watercolor, storybook ink"
            />
          </label>
        </div>
        <div className="profileModal__actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button buttonPrimary" onClick={submit} disabled={!name.trim()}>
            Save character
          </button>
        </div>
      </div>
    </div>
  );
}
