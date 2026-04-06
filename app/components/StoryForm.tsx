"use client";

import React from "react";
import type { VoiceItem } from "@/app/hooks/useTts";
import { VoiceRecorder } from "@/app/components/VoiceRecorder";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";

const AGE_OPTIONS = ["3 months", "6 months", "9 months", "1 year", "2 years"];
const LANG_OPTIONS = [
  { label: "English", value: "en" },
  { label: "中文（繁體）", value: "zh-Hant" },
];
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
const LENGTH_OPTIONS = [
  { label: "Short (1-2 min)", value: "short" },
  { label: "Medium (3-5 min)", value: "medium" },
  { label: "Long (6-9 min)", value: "long" },
];
const CHILD_GENDER_OPTIONS = [
  { label: "Any / not specified", value: "any" },
  { label: "Girl", value: "girl" },
  { label: "Boy", value: "boy" },
  { label: "Non-binary / other", value: "nonbinary" },
];

type Props = {
  age: string;
  language: string;
  mainCharacterName: string;
  childGender: string;
  genre: string;
  length: string;
  title: string;
  storyInput: string;
  onAgeChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onMainCharacterNameChange: (value: string) => void;
  onChildGenderChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onStoryInputChange: (value: string) => void;
  voices: VoiceItem[];
  selectedVoiceId: string;
  onVoiceChange: (value: string) => void;
  isGenerating: boolean;
  isSaving: boolean;
  isMakingMp3: boolean;
  hasStory: boolean;
  onGenerate: () => void;
  onSave: () => void;
  onMakeMp3: () => void;
  onCreatePoster: () => void;
  isMakingPoster: boolean;
  isLoadingVoices?: boolean;
  voicesError?: string;
  onRetryVoices?: () => void;
  hasClonedVoice?: boolean;
  onRegisterClonedVoice?: (voiceId: string, label: string, requiresVerification: boolean) => void;
  onClearClonedVoice?: () => void;
  /** Full creation (generate, save, poster, clone) requires membership. */
  member: boolean;
  /** Narration works for members, or for guests when the text is the configured sample story. */
  canPlayNarration: boolean;
};

export function StoryForm(props: Props) {
  return (
    <section className="panel">
      <h2 className="panelTitle">Story details</h2>
      {!props.member ? (
        <p className="fieldHint" style={{ marginTop: 0, marginBottom: 12 }}>
          Sample mode: you can listen to the default story with <strong>Make MP3</strong>. Log in and join membership in
          Profile to generate and save your own stories.
        </p>
      ) : null}

      <div className="fieldGrid">
        <label className="field">
          <span className="label">For what age</span>
          <select value={props.age} onChange={(e) => props.onAgeChange(e.target.value)}>
            {AGE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Language</span>
          <select value={props.language} onChange={(e) => props.onLanguageChange(e.target.value)}>
            {LANG_OPTIONS.map((value) => (
              <option key={value.value} value={value.value}>
                {value.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Voice</span>
          <select
            value={props.selectedVoiceId}
            onChange={(e) => props.onVoiceChange(e.target.value)}
            disabled={props.isLoadingVoices || (props.voices.length === 0 && !props.voicesError)}
          >
            {props.isLoadingVoices ? (
              <option value="">Loading voices…</option>
            ) : props.voicesError ? (
              <option value="">Voices unavailable</option>
            ) : props.voices.length === 0 ? (
              <option value="">No voices found</option>
            ) : (
              <>
                <option value="">Auto / Default</option>
                {props.voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name ?? voice.id}
                  </option>
                ))}
              </>
            )}
          </select>
          {props.voicesError ? (
            <div className="fieldErrorRow" role="alert">
              <span className="fieldErrorText">{props.voicesError}</span>
              {props.onRetryVoices ? (
                <button className="button buttonInline" type="button" onClick={props.onRetryVoices} disabled={props.isLoadingVoices}>
                  {props.isLoadingVoices ? "Loading…" : "Retry voices"}
                </button>
              ) : null}
            </div>
          ) : null}
          {props.onRegisterClonedVoice && props.onClearClonedVoice ? (
            <VoiceRecorder
              language={props.language}
              disabled={props.isGenerating || props.isMakingMp3}
              hasClone={Boolean(props.hasClonedVoice)}
              onCloned={props.onRegisterClonedVoice}
              onClearClone={props.onClearClonedVoice}
            />
          ) : null}
        </label>

        <label className="field">
          <span className="label">Main character name</span>
          <input
            value={props.mainCharacterName}
            onChange={(e) => props.onMainCharacterNameChange(e.target.value)}
            placeholder="e.g. Lulu"
          />
        </label>

        <label className="field">
          <span className="label">Child (for tailoring)</span>
          <select value={props.childGender} onChange={(e) => props.onChildGenderChange(e.target.value)}>
            {CHILD_GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Story type (genre)</span>
          <select value={props.genre} onChange={(e) => props.onGenreChange(e.target.value)}>
            {GENRE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Length</span>
          <select value={props.length} onChange={(e) => props.onLengthChange(e.target.value)}>
            {LENGTH_OPTIONS.map((value) => (
              <option key={value.value} value={value.value}>
                {value.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Title (optional)</span>
          <input
            value={props.title}
            onChange={(e) => props.onTitleChange(e.target.value)}
            placeholder="e.g. Lulu and the Moon"
          />
        </label>

        <label className="field">
          <span className="label">Story Input</span>
          <textarea
            value={props.storyInput}
            maxLength={STORY_INPUT_MAX_CHARS}
            onChange={(e) => props.onStoryInputChange(e.target.value)}
            placeholder="Short guidance for this story (optional)"
            rows={3}
            aria-describedby="story-input-hint"
          />
          <span id="story-input-hint" className="fieldHint">
            {props.storyInput.length}/{STORY_INPUT_MAX_CHARS} characters
          </span>
        </label>

        <div className="actions">
          <button
            className="button buttonPrimary"
            onClick={props.onGenerate}
            disabled={props.isGenerating || !props.member}
            type="button"
          >
            {props.isGenerating ? "Generating…" : "Generate"}
          </button>
          <button
            className="button"
            onClick={props.onSave}
            disabled={props.isSaving || !props.hasStory || !props.member}
            type="button"
          >
            {props.isSaving ? "Saving…" : "Save"}
          </button>
          <button
            className="button"
            onClick={props.onMakeMp3}
            disabled={props.isMakingMp3 || !props.hasStory || !props.canPlayNarration}
            type="button"
          >
            {props.isMakingMp3 ? "Making MP3…" : "Make MP3"}
          </button>
          <button
            className="button"
            onClick={props.onCreatePoster}
            disabled={props.isMakingPoster || !props.hasStory || !props.member}
            type="button"
          >
            {props.isMakingPoster ? "Creating poster…" : "Create poster"}
          </button>
        </div>
      </div>
    </section>
  );
}
