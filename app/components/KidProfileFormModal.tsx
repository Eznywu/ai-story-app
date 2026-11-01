"use client";

import React, { useState } from "react";
import type { KidProfile } from "@/lib/profiles/profilesTypes";
import { AgeRangeSlider } from "@/app/components/AgeRangeSlider";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
const GENRE_OPTIONS = [
  "Animals",
  "Adventure",
  "Fantasy",
  "Friendship",
  "Family",
  "Magic",
  "Nature",
  "Space",
  "Underwater",
  "Holiday",
  "Fairy Tale",
  "Mystery",
  "Superhero",
  "Bedtime Classic",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (profile: Omit<KidProfile, "id">) => void;
};

export function KidProfileFormModal({ open, onClose, onSave }: Props) {
  const { messages } = useInterfaceLocale();
  const copy = messages.kid;
  const [name, setName] = useState("");
  const [age, setAge] = useState("6 months");
  const [gender, setGender] = useState<KidProfile["gender"]>("girl");
  const [interests, setInterests] = useState<string[]>([]);

  if (!open) return null;

  function toggleInterest(g: string) {
    setInterests((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function submit() {
    const n = name.trim();
    if (!n) return;
    onSave({ name: n, age, gender, interests });
    setName("");
    setAge("6 months");
    setGender("girl");
    setInterests([]);
    onClose();
  }

  return (
    <div className="profileModalBackdrop" role="presentation" onClick={onClose}>
      <div
        className="profileModal"
        role="dialog"
        aria-labelledby="kid-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profileModal__header">
          <h2 id="kid-form-title" className="profileModal__title">
            {copy.title}
          </h2>
          <button type="button" className="profileModal__close" onClick={onClose} aria-label={messages.common.close}>
            ×
          </button>
        </div>
        <div className="fieldGrid">
          <label className="field">
            <span className="label">{copy.name}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <div className="field ageField">
            <AgeRangeSlider id="kid-profile-age-slider" label={copy.age} value={age} onChange={setAge} />
          </div>
          <div className="field">
            <span className="label">{copy.gender}</span>
            <div className="profileModal__segmented">
              {(
                [
                  ["boy", copy.boy],
                  ["girl", copy.girl],
                  ["other", copy.other],
                ] as const
              ).map(([v, lab]) => (
                <button
                  key={v}
                  type="button"
                  className={`profileModal__seg${gender === v ? " profileModal__seg--on" : ""}`}
                  onClick={() => setGender(v)}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label">{copy.interests}</span>
            <p className="profileModal__fieldHint">{copy.interestsHint}</p>
            <div className="profileModal__tags">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`profileModal__tag${interests.includes(g) ? " profileModal__tag--on" : ""}`}
                  onClick={() => toggleInterest(g)}
                >
                  {messages.voice.genres[g as keyof typeof messages.voice.genres] || g}
                </button>
              ))}
            </div>
          </div>
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
