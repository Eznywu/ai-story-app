"use client";

import { useState } from "react";
import type { VoiceItem } from "@/app/hooks/useTts";
import { QuietSheet } from "@/app/components/QuietSheet";
import { StorySetupExtras } from "@/app/components/StorySetupExtras";
import { languageLabel, voiceSummary } from "@/app/components/voiceLabel";
import { STORY_AGE_OPTIONS } from "@/lib/stories/storyAgeOptions";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profiles/profilesTypes";

const GENRES = [
  "Animals",
  "Adventure",
  "Friendship",
  "Fantasy",
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

const FEATURED = ["Animals", "Adventure", "Friendship"];

const LENGTHS = [
  { label: "Short", value: "short" },
  { label: "Medium", value: "medium" },
  { label: "Long", value: "long" },
];

const GENDERS = [
  { label: "Any", value: "any" },
  { label: "Girl", value: "girl" },
  { label: "Boy", value: "boy" },
  { label: "Other", value: "nonbinary" },
];

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

function initialOf(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return Array.from(trimmed)[0];
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5l1.6 4.4L18 9.5l-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6L12 3.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h1.2M7.2 8v8M10.2 5.5v13M13.2 8.5v7M16.2 6v12M19.2 9.5v5M22 12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThemeIcon({ genre }: { genre: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
    className: "createTheme__icon",
  };
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (genre === "Animals") {
    return (
      <svg {...common}>
        <path {...stroke} d="M8 10.5c0-1.8-1.2-3-2.4-3S3.5 8.7 4.2 10.2 6.2 13 8 12.2" />
        <path {...stroke} d="M16 10.5c0-1.8 1.2-3 2.4-3s2.1 1.2 1.4 2.7S17.8 13 16 12.2" />
        <path {...stroke} d="M9.2 6.2C9.2 4.6 10.2 3.5 12 3.5s2.8 1.1 2.8 2.7c0 1-.4 1.6-.8 2" />
        <path {...stroke} d="M7.2 14.2c.4 3 2.2 5.3 4.8 5.3s4.4-2.3 4.8-5.3c-1.2.6-2.8.9-4.8.9s-3.6-.3-4.8-.9z" />
      </svg>
    );
  }
  if (genre === "Adventure") {
    return (
      <svg {...common}>
        <circle {...stroke} cx="12" cy="12" r="8" />
        <path {...stroke} d="M12 4.5v3.2M12 16.3V19.5M4.5 12h3.2M16.3 12H19.5" />
        <path {...stroke} d="M12 8.2l2.1 3.8H9.9L12 8.2z" />
      </svg>
    );
  }
  if (genre === "Friendship" || genre === "Family") {
    return (
      <svg {...common}>
        <path
          {...stroke}
          d="M12 18.5s-6.2-3.8-6.2-8.1A3.4 3.4 0 0112 8.2a3.4 3.4 0 016.2 2.2c0 4.3-6.2 8.1-6.2 8.1z"
        />
      </svg>
    );
  }
  if (genre === "Nature") {
    return (
      <svg {...common}>
        <path {...stroke} d="M12 20V10" />
        <path {...stroke} d="M12 13c-3.2-.2-5-2.2-5-4.6 3 .2 5 2.2 5 4.6zM12 11c3-.2 5-2.2 5-4.6-3 .2-5 2.2-5 4.6z" />
      </svg>
    );
  }
  if (genre === "Space") {
    return (
      <svg {...common}>
        <path {...stroke} d="M12 4l1.1 3.2L16.4 8.3 13.1 9.4 12 12.6 10.9 9.4 7.6 8.3l3.3-1.1L12 4z" />
        <path {...stroke} d="M17.5 14.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z" />
      </svg>
    );
  }
  if (genre === "Underwater") {
    return (
      <svg {...common}>
        <path {...stroke} d="M12 4.5c2.2 2.4 2.2 4.6 0 7-2.2 2.4-2.2 4.6 0 7" />
        <path {...stroke} d="M7 6.5c2.2 2.4 2.2 4.6 0 7" />
        <path {...stroke} d="M17 6.5c-2.2 2.4-2.2 4.6 0 7" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path {...stroke} d="M12 4.2l1.3 3.6 3.6 1.3-3.6 1.3L12 14l-1.3-3.6-3.6-1.3 3.6-1.3L12 4.2z" />
      <path {...stroke} d="M7 16.5h10" />
    </svg>
  );
}

/**
 * Create screen `/` tab=create.
 * Top to bottom: title, child summary, tonight's theme, length, voice, optional note, Create story.
 * Child and voice rows open sheets. Create story stays the gold action above the tab bar.
 */
export function CreateStoryPicker(props: Props) {
  const guidanceOpenByDefault = Boolean(
    props.storyInput.trim() ||
      props.theme.trim() ||
      props.mood.trim() ||
      props.educationalGoal.trim() ||
      props.moralLesson.trim() ||
      props.seriesMode === "series"
  );
  const [whoOpen, setWhoOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(!FEATURED.includes(props.genre));
  const [touchOpen, setTouchOpen] = useState(guidanceOpenByDefault);

  const langGroup = props.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  const matchingVoices = props.voices.filter((voice) =>
    (voice.language ?? "en").toLowerCase().startsWith(langGroup)
  );
  const voiceChoices = matchingVoices.length ? matchingVoices : props.voices;
  const selectedVoice = props.voices.find((voice) => voice.id === props.selectedVoiceId);
  const voiceLabel = props.isLoadingVoices
    ? "Loading voices…"
    : props.voicesError
      ? "Voices unavailable"
      : voiceSummary(selectedVoice, props.language);

  const childName = props.mainCharacterName.trim();
  const visibleGenres =
    themesOpen || !FEATURED.includes(props.genre)
      ? themesOpen
        ? GENRES
        : ["Animals", "Adventure", props.genre]
      : FEATURED;

  return (
    <div className="createScreen">
      <header className="createScreen__hero">
        <h1 className="createScreen__title">Create a story</h1>
        <p className="createScreen__subtitle">A little magic before bedtime.</p>
      </header>

      <h2 className="createScreen__label">For</h2>
      <button
        type="button"
        className="createRow"
        onClick={() => setWhoOpen(true)}
        aria-haspopup="dialog"
        aria-label={childName ? `Story for ${childName}, ${props.age}` : "Choose who this story is for"}
      >
        <span className="createAvatar" aria-hidden>
          {initialOf(childName)}
        </span>
        <span className="createRow__text">
          <span className="createRow__title">{childName || "Choose a child"}</span>
          <span className="createRow__meta">{props.age}</span>
        </span>
        <IconChevron className="createRow__chevron" />
      </button>

      <h2 className="createScreen__label">Tonight&apos;s theme</h2>
      <div className="createThemes" role="listbox" aria-label="Tonight's theme">
        {visibleGenres.map((genre) => {
          const selected = props.genre === genre;
          return (
            <button
              key={genre}
              type="button"
              role="option"
              aria-selected={selected}
              className={`createTheme${selected ? " createTheme--on" : ""}`}
              onClick={() => props.onGenreChange(genre)}
            >
              <ThemeIcon genre={genre} />
              <span className="createTheme__label">{genre}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="createLink" onClick={() => setThemesOpen((open) => !open)}>
        {themesOpen ? "Fewer themes" : "More themes"}
      </button>

      <h2 className="createScreen__label">Story length</h2>
      <div className="createLength" role="radiogroup" aria-label="Story length">
        {LENGTHS.map((item) => {
          const selected = props.length === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={selected ? "createLength__opt createLength__opt--on" : "createLength__opt"}
              onClick={() => props.onLengthChange(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <h2 className="createScreen__label">Read by</h2>
      <button
        type="button"
        className="createRow"
        onClick={() => setVoiceOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Read by ${voiceLabel}`}
      >
        <span className="createRow__glyph" aria-hidden>
          <IconWave className="createRow__wave" />
        </span>
        <span className="createRow__text">
          <span className="createRow__title">{voiceLabel}</span>
        </span>
        <IconChevron className="createRow__chevron" />
      </button>

      <button
        type="button"
        className="createLink createLink--touch"
        aria-expanded={touchOpen}
        onClick={() => setTouchOpen((open) => !open)}
      >
        {touchOpen ? "Hide personal touch" : "+ Add a personal touch"}
      </button>
      {touchOpen ? (
        <div className="createTouch">
          <label className="createTouch__field" htmlFor="personal-touch">
            <span className="createScreen__label">Optional guidance</span>
            <textarea
              id="personal-touch"
              value={props.storyInput}
              maxLength={STORY_INPUT_MAX_CHARS}
              rows={3}
              placeholder="A fear to skip, a favorite animal…"
              onChange={(event) => props.onStoryInputChange(event.target.value)}
              onFocus={(event) => {
                event.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
              }}
            />
          </label>
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
        </div>
      ) : null}

      <div className="createScreen__action">
        <button
          type="button"
          className="createScreen__submit"
          onClick={props.onCreate}
          disabled={props.isGenerating}
        >
          <IconSpark className="createScreen__submitIcon" />
          {props.isGenerating ? "Creating…" : "Create story"}
        </button>
      </div>

      {whoOpen ? (
        <QuietSheet title="Who is this for?" onClose={() => setWhoOpen(false)}>
          <label className="createSheet__field">
            <span className="createScreen__label">Name</span>
            <input
              value={props.mainCharacterName}
              onChange={(event) => props.onMainCharacterNameChange(event.target.value)}
              placeholder="Child's name"
              aria-label="Child or character name"
              autoComplete="off"
            />
          </label>
          <div className="createScreen__label">Age</div>
          <div className="createSheet__chips" role="listbox" aria-label="Age">
            {STORY_AGE_OPTIONS.map((age) => (
              <button
                key={age}
                type="button"
                className={`createSheet__chip${props.age === age ? " createSheet__chip--on" : ""}`}
                aria-pressed={props.age === age}
                onClick={() => props.onAgeChange(age)}
              >
                {age}
              </button>
            ))}
          </div>
          <div className="createScreen__label">Child</div>
          <div className="createSheet__chips" role="listbox" aria-label="Child">
            {GENDERS.map((gender) => (
              <button
                key={gender.value}
                type="button"
                className={`createSheet__chip${props.childGender === gender.value ? " createSheet__chip--on" : ""}`}
                aria-pressed={props.childGender === gender.value}
                onClick={() => props.onChildGenderChange(gender.value)}
              >
                {gender.label}
              </button>
            ))}
          </div>
          {props.kids.length || props.characters.length ? (
            <>
              <div className="createScreen__label">Saved</div>
              <div className="createSheet__chips" aria-label="Saved kids and characters">
                {props.kids.map((kid) => (
                  <button
                    key={kid.id}
                    type="button"
                    className={`createSheet__chip${props.mainCharacterName === kid.name ? " createSheet__chip--on" : ""}`}
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
                      setWhoOpen(false);
                    }}
                  >
                    {kid.name}
                  </button>
                ))}
                {props.characters.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    className={`createSheet__chip${
                      props.mainCharacterName === character.name ? " createSheet__chip--on" : ""
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
                      setWhoOpen(false);
                    }}
                  >
                    {character.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div className="createSheet__chips">
            <button
              type="button"
              className="createSheet__chip"
              onClick={() => {
                setWhoOpen(false);
                props.onAddKid();
              }}
            >
              + Kid
            </button>
            <button
              type="button"
              className="createSheet__chip"
              onClick={() => {
                setWhoOpen(false);
                props.onAddCharacter();
              }}
            >
              + Character
            </button>
          </div>
        </QuietSheet>
      ) : null}

      {voiceOpen ? (
        <QuietSheet title="Read by" onClose={() => setVoiceOpen(false)}>
          <div className="createSheet__chips" role="group" aria-label="Language">
            <button
              type="button"
              className={`createSheet__chip${props.language === "en" ? " createSheet__chip--on" : ""}`}
              aria-pressed={props.language === "en"}
              onClick={() => props.onLanguageChange("en")}
            >
              English
            </button>
            <button
              type="button"
              className={`createSheet__chip${props.language === "zh-Hant" ? " createSheet__chip--on" : ""}`}
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
                <button className="createLink" type="button" onClick={props.onRetryVoices}>
                  Retry voices
                </button>
              ) : null}
            </div>
          ) : (
            <div className="createSheet__list" role="listbox" aria-label="Voice">
              {props.isLoadingVoices ? <p className="createRow__meta">Loading voices…</p> : null}
              {voiceChoices.map((voice) => {
                const selected = props.selectedVoiceId === voice.id;
                const label = voiceSummary(voice, voice.language || props.language);
                return (
                  <button
                    key={voice.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`createSheet__voice${selected ? " createSheet__voice--on" : ""}`}
                    onClick={() => {
                      props.onVoiceChange(voice.id);
                      setVoiceOpen(false);
                    }}
                  >
                    <IconWave className="createRow__wave" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="createRow__meta">{languageLabel(props.language)} narration</p>
        </QuietSheet>
      ) : null}
    </div>
  );
}
