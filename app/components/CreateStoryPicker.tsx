"use client";

import { useState } from "react";
import type { VoiceItem } from "@/app/hooks/useTts";
import { StorySetupExtras } from "@/app/components/StorySetupExtras";
import { STORY_AGE_OPTIONS } from "@/lib/stories/storyAgeOptions";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profiles/profilesTypes";

const GENRES = [
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

const LENGTHS = [
  { label: "Short", hint: "1–2 min", value: "short" },
  { label: "Medium", hint: "3–5 min", value: "medium" },
  { label: "Long", hint: "6–9 min", value: "long" },
];

const GENDERS = [
  { label: "Any", value: "any" },
  { label: "Girl", value: "girl" },
  { label: "Boy", value: "boy" },
  { label: "Other", value: "nonbinary" },
];

type Step = "who" | "theme" | "length" | "voice";

const STEPS: { id: Step; label: string }[] = [
  { id: "who", label: "Who" },
  { id: "theme", label: "Theme" },
  { id: "length", label: "Length" },
  { id: "voice", label: "Voice" },
];

function shortAge(age: string) {
  if (age === "3 months") return "3 mo";
  if (age === "6 months") return "6 mo";
  if (age === "9 months") return "9 mo";
  if (age === "1 year") return "1 yr";
  if (age === "2 years") return "2 yr";
  return age;
}

type Props = {
  kids: KidProfile[];
  characters: StoryCharacterProfile[];
  age: string;
  language: string;
  mainCharacterName: string;
  childGender: string;
  genre: string;
  length: string;
  storyInput: string;
  theme: string;
  mood: string;
  seriesMode: "one_shot" | "series";
  educationalGoal: string;
  moralLesson: string;
  voices: VoiceItem[];
  selectedVoiceId: string;
  isLoadingVoices?: boolean;
  voicesError?: string;
  isGenerating: boolean;
  onAgeChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onMainCharacterNameChange: (value: string) => void;
  onChildGenderChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onStoryInputChange: (value: string) => void;
  onThemeChange: (value: string) => void;
  onMoodChange: (value: string) => void;
  onSeriesModeChange: (value: "one_shot" | "series") => void;
  onEducationalGoalChange: (value: string) => void;
  onMoralLessonChange: (value: string) => void;
  onVoiceChange: (value: string) => void;
  onRetryVoices?: () => void;
  onAddKid: () => void;
  onAddCharacter: () => void;
  onCreate: () => void;
};

/**
 * Create screen — one viewport, no page scroll required to finish a selection.
 * Who / Theme / Length / Voice switch the card. Create stays pinned.
 * Optional note is one line; tone and goals open in a sheet.
 */
export function CreateStoryPicker(props: Props) {
  const [step, setStep] = useState<Step>("who");
  const [moreOpen, setMoreOpen] = useState(false);

  const voiceName =
    props.voices.find((voice) => voice.id === props.selectedVoiceId)?.name ||
    (props.isLoadingVoices ? "…" : "Auto");
  const lengthLabel = LENGTHS.find((item) => item.value === props.length)?.label ?? "Short";
  const whoLabel = props.mainCharacterName.trim() || "Name";
  const stepValue: Record<Step, string> = {
    who: whoLabel,
    theme: props.genre,
    length: lengthLabel,
    voice: voiceName,
  };

  const langGroup = props.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  const matchingVoices = props.voices.filter((voice) =>
    (voice.language ?? "en").toLowerCase().startsWith(langGroup)
  );
  const voiceChoices = matchingVoices.length ? matchingVoices : props.voices;

  return (
    <div className="createPicker">
      <div className="createPicker__steps" role="tablist" aria-label="Story choices">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={step === item.id}
            className={`createPicker__step${step === item.id ? " createPicker__step--active" : ""}`}
            onClick={() => setStep(item.id)}
          >
            <span className="createPicker__stepLabel">{item.label}</span>
            <span className="createPicker__stepValue">{stepValue[item.id]}</span>
          </button>
        ))}
      </div>

      <div className="createPicker__card" role="tabpanel">
        {step === "who" ? (
          <div className="createPicker__panel">
            <label className="createPicker__field">
              <span className="createPicker__label">Name</span>
              <input
                value={props.mainCharacterName}
                onChange={(event) => props.onMainCharacterNameChange(event.target.value)}
                placeholder="Who is this story for?"
                aria-label="Child or character name"
              />
            </label>
            <div className="createPicker__label">Age</div>
            <div className="createPicker__chips" role="listbox" aria-label="Age">
              {STORY_AGE_OPTIONS.map((age) => (
                <button
                  key={age}
                  type="button"
                  className={`createPicker__chip${props.age === age ? " createPicker__chip--active" : ""}`}
                  aria-pressed={props.age === age}
                  onClick={() => props.onAgeChange(age)}
                >
                  {shortAge(age)}
                </button>
              ))}
            </div>
            <div className="createPicker__label">Child</div>
            <div className="createPicker__chips" role="listbox" aria-label="Child">
              {GENDERS.map((gender) => (
                <button
                  key={gender.value}
                  type="button"
                  className={`createPicker__chip${props.childGender === gender.value ? " createPicker__chip--active" : ""}`}
                  aria-pressed={props.childGender === gender.value}
                  onClick={() => props.onChildGenderChange(gender.value)}
                >
                  {gender.label}
                </button>
              ))}
            </div>
            <div className="createPicker__savedRow">
              <div className="createPicker__scroll" aria-label="Saved kids and characters">
                {props.kids.map((kid) => (
                  <button
                    key={kid.id}
                    type="button"
                    className={`createPicker__chip${
                      props.mainCharacterName === kid.name ? " createPicker__chip--active" : ""
                    }`}
                    onClick={() => {
                      props.onMainCharacterNameChange(kid.name);
                      props.onAgeChange(kid.age);
                      props.onChildGenderChange(
                        kid.gender === "boy" ? "boy" : kid.gender === "girl" ? "girl" : "nonbinary"
                      );
                      if (kid.interests.length) {
                        props.onStoryInputChange(
                          `Interests: ${kid.interests.join(", ")}`.slice(0, STORY_INPUT_MAX_CHARS)
                        );
                      }
                    }}
                  >
                    {kid.name}
                  </button>
                ))}
                {props.characters.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    className={`createPicker__chip${
                      props.mainCharacterName === character.name ? " createPicker__chip--active" : ""
                    }`}
                    onClick={() => {
                      props.onMainCharacterNameChange(character.name);
                      props.onChildGenderChange("any");
                      const note = [
                        character.characterType && `Type: ${character.characterType}`,
                        character.personality && `Personality: ${character.personality}`,
                        character.themes.length && `Themes: ${character.themes.join(", ")}`,
                      ]
                        .filter(Boolean)
                        .join(". ");
                      if (note) props.onStoryInputChange(note.slice(0, STORY_INPUT_MAX_CHARS));
                    }}
                  >
                    {character.name}
                  </button>
                ))}
                <button type="button" className="createPicker__chip" onClick={props.onAddKid}>
                  + Kid
                </button>
                <button type="button" className="createPicker__chip" onClick={props.onAddCharacter}>
                  + Character
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "theme" ? (
          <div className="createPicker__chips createPicker__chips--grid" role="listbox" aria-label="Theme">
            {GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                className={`createPicker__chip${props.genre === genre ? " createPicker__chip--active" : ""}`}
                aria-pressed={props.genre === genre}
                onClick={() => props.onGenreChange(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        ) : null}

        {step === "length" ? (
          <div className="createPicker__lengths" role="listbox" aria-label="Length">
            {LENGTHS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`createPicker__length${props.length === item.value ? " createPicker__length--active" : ""}`}
                aria-pressed={props.length === item.value}
                onClick={() => props.onLengthChange(item.value)}
              >
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        ) : null}

        {step === "voice" ? (
          <div className="createPicker__panel">
            <div className="createPicker__langs" role="group" aria-label="Language">
              <button
                type="button"
                className={`createPicker__chip${props.language === "en" ? " createPicker__chip--active" : ""}`}
                aria-pressed={props.language === "en"}
                onClick={() => props.onLanguageChange("en")}
              >
                English
              </button>
              <button
                type="button"
                className={`createPicker__chip${props.language === "zh-Hant" ? " createPicker__chip--active" : ""}`}
                aria-pressed={props.language === "zh-Hant"}
                onClick={() => props.onLanguageChange("zh-Hant")}
              >
                中文
              </button>
            </div>
            {props.voicesError ? (
              <div className="fieldErrorRow" role="alert">
                <span className="fieldErrorText">{props.voicesError}</span>
                {props.onRetryVoices ? (
                  <button className="button buttonInline" type="button" onClick={props.onRetryVoices}>
                    Retry voices
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="createPicker__chips" role="listbox" aria-label="Voice">
                {props.isLoadingVoices ? <span className="createPicker__hint">Loading voices…</span> : null}
                {voiceChoices.map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    className={`createPicker__chip${
                      props.selectedVoiceId === voice.id ? " createPicker__chip--active" : ""
                    }`}
                    aria-pressed={props.selectedVoiceId === voice.id}
                    onClick={() => props.onVoiceChange(voice.id)}
                  >
                    {voice.name ?? voice.id}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <label className="createPicker__note">
        <span className="visuallyHidden">Optional guidance</span>
        <input
          value={props.storyInput}
          maxLength={STORY_INPUT_MAX_CHARS}
          onChange={(event) => props.onStoryInputChange(event.target.value)}
          placeholder="Optional note (a fear to skip, a favorite animal…)"
          aria-label="Optional story note"
        />
        <button type="button" className="createPicker__more" onClick={() => setMoreOpen(true)}>
          More
        </button>
      </label>

      <button
        type="button"
        className="button buttonPrimary createPicker__create"
        onClick={props.onCreate}
        disabled={props.isGenerating}
      >
        {props.isGenerating ? "Creating…" : "Create story"}
      </button>

      {moreOpen ? (
        <div className="profileModalBackdrop" role="presentation" onClick={() => setMoreOpen(false)}>
          <div
            className="profileModal profileModal--wide"
            role="dialog"
            aria-labelledby="create-more-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profileModal__header">
              <h2 id="create-more-title" className="profileModal__title">
                Optional guidance
              </h2>
              <button type="button" className="profileModal__close" onClick={() => setMoreOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <StorySetupExtras
              theme={props.theme}
              mood={props.mood}
              seriesMode={props.seriesMode}
              educationalGoal={props.educationalGoal}
              moralLesson={props.moralLesson}
              onThemeChange={props.onThemeChange}
              onMoodChange={props.onMoodChange}
              onSeriesModeChange={props.onSeriesModeChange}
              onEducationalGoalChange={props.onEducationalGoalChange}
              onMoralLessonChange={props.onMoralLessonChange}
            />
            <div className="profileModal__actions">
              <button type="button" className="button buttonPrimary" onClick={() => setMoreOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
