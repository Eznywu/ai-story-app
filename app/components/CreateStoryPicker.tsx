"use client";

import { useState } from "react";
import type { PersonalVoiceAccess, VoiceItem } from "@/app/hooks/useTts";
import { useVoicePreview, type VoicePreviewControls } from "@/app/hooks/useVoicePreview";
import { AddMyVoiceFlow } from "@/app/components/AddMyVoiceFlow";
import { HappyHorseCheck } from "@/app/components/HappyHorseCheck";
import { QuietSheet } from "@/app/components/QuietSheet";
import { StorySetupExtras } from "@/app/components/StorySetupExtras";
import { VoicePreviewButton, VoicePreviewError } from "@/app/components/VoicePreviewButton";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { voiceSummary } from "@/app/components/voiceLabel";
import { STORY_AGE_OPTIONS } from "@/lib/stories/storyAgeOptions";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";
import { fill } from "@/lib/i18n/locales";
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
  personalVoices?: PersonalVoiceAccess;
  voiceLimit?: number | null;
  voiceNotice?: string;
  personalNote?: string;
  isLoadingVoices?: boolean;
  voicesError?: string;
  isGenerating: boolean;
  submitLabel?: string;
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
  onVoiceCreated?: (voiceId: string, selectable: boolean) => void;
  onRetryVoices?: () => void;
  onAddKid: () => void;
  onAddCharacter: () => void;
  onSelectKid?: (kid: KidProfile) => void;
  onSelectCharacter?: (character: StoryCharacterProfile) => void;
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

function IconMic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 11.5a6 6 0 0012 0M12 17.5v3M9 20.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  const [addingVoice, setAddingVoice] = useState(false);
  /** Opened straight from Make my voice: leaving the recording closes the sheet instead of showing the list. */
  const [addingFromCard, setAddingFromCard] = useState(false);
  const [renameId, setRenameId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [deleteAudio, setDeleteAudio] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);
  const [manageError, setManageError] = useState("");
  const { messages } = useInterfaceLocale();
  const copy = messages.voice;
  const preview = useVoicePreview(copy);

  function closeVoiceSheet() {
    preview.stop();
    setAddingVoice(false);
    setAddingFromCard(false);
    setVoiceOpen(false);
  }

  function openVoiceSheet(adding: boolean) {
    preview.stop();
    setAddingVoice(adding);
    setAddingFromCard(adding);
    setVoiceOpen(true);
  }

  async function manageVoice(method: "PATCH" | "DELETE", id: string, body: object, done: () => void) {
    if (manageBusy) return;
    setManageBusy(true);
    setManageError("");
    try {
      const res = await fetch(`/api/voices/${encodeURIComponent(id)}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (redirectIfUnsigned(res.status)) return;
      if (!res.ok) {
        setManageError(typeof data?.error === "string" && data.error ? data.error : copy.failed);
        return;
      }
      done();
      props.onRetryVoices?.();
    } catch {
      setManageError(copy.failed);
    } finally {
      setManageBusy(false);
    }
  }
  const ageText = messages.ages[props.age as keyof typeof messages.ages] || props.age;
  const [themesOpen, setThemesOpen] = useState(!FEATURED.includes(props.genre));
  const [touchOpen, setTouchOpen] = useState(guidanceOpenByDefault);

  const voiceChoices = props.voices.filter((voice) => voice.group !== "mine" && voiceSpeaks(voice, props.language));
  const selectedVoice = props.voices.find((voice) => voice.id === props.selectedVoiceId);
  const voiceLabel = props.isLoadingVoices
    ? copy.loadingVoices
    : props.voicesError
      ? copy.voicesUnavailable
      : selectedVoice?.name || voiceSummary(selectedVoice, props.language);

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
        <h1 className="createScreen__title">{copy.createTitle}</h1>
        <p className="createScreen__subtitle">{copy.createSubtitle}</p>
      </header>

      <h2 className="createScreen__label">{copy.forChild}</h2>
      <button
        type="button"
        className="createRow"
        onClick={() => setWhoOpen(true)}
        aria-haspopup="dialog"
        aria-label={childName ? `${copy.forChild} ${childName}, ${ageText}` : copy.chooseChild}
      >
        <span className="createAvatar" aria-hidden>
          {initialOf(childName)}
        </span>
        <span className="createRow__text">
          <span className="createRow__title">{childName || copy.chooseChild}</span>
          <span className="createRow__meta">{ageText}</span>
        </span>
        <IconChevron className="createRow__chevron" />
      </button>

      <h2 className="createScreen__label">{copy.tonight}</h2>
      <div className="createThemes" role="listbox" aria-label={copy.tonight}>
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
              {selected ? <span className="createTheme__check" aria-hidden>✓</span> : null}
              <span className="createTheme__label">{copy.genres[genre as keyof typeof copy.genres] || genre}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="createLink" onClick={() => setThemesOpen((open) => !open)}>
        {themesOpen ? copy.fewerThemes : copy.moreThemes}
      </button>

      <h2 className="createScreen__label">{copy.storyLength}</h2>
      <div className="createLength" role="radiogroup" aria-label={copy.storyLength}>
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
              {item.value === "short" ? copy.lengthShort : item.value === "medium" ? copy.lengthMedium : copy.lengthLong}
            </button>
          );
        })}
      </div>

      <h2 className="createScreen__label">{copy.language}</h2>
      <div className="createSheet__chips" role="group" aria-label={copy.language}>
        <button
          type="button"
          className={`createSheet__chip${props.language === "en" ? " createSheet__chip--on" : ""}`}
          aria-pressed={props.language === "en"}
          onClick={() => props.onLanguageChange("en")}
        >
          {copy.english}
        </button>
        <button
          type="button"
          className={`createSheet__chip${props.language === "zh-Hant" ? " createSheet__chip--on" : ""}`}
          aria-pressed={props.language === "zh-Hant"}
          onClick={() => props.onLanguageChange("zh-Hant")}
        >
          {copy.chinese}
        </button>
      </div>

      <MyVoiceCard
        mine={props.voices.filter((voice) => voice.group === "mine")}
        selectedVoiceId={props.selectedVoiceId}
        language={props.language}
        voiceLimit={props.voiceLimit ?? null}
        preview={preview}
        onMake={() => openVoiceSheet(true)}
        onChange={() => openVoiceSheet(false)}
        onUse={(id) => props.onVoiceChange(id)}
      />

      <h2 className="createScreen__label">{copy.readBy}</h2>
      <button
        type="button"
        className="createRow"
        onClick={() => openVoiceSheet(false)}
        aria-haspopup="dialog"
        aria-label={`${copy.readBy} ${voiceLabel}`}
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
        {touchOpen ? copy.hideTouch : copy.personalTouch}
      </button>
      {touchOpen ? (
        <div className="createTouch">
          <label className="createTouch__field" htmlFor="personal-touch">
            <span className="createScreen__label">{copy.guidance}</span>
            <textarea
              id="personal-touch"
              value={props.storyInput}
              maxLength={STORY_INPUT_MAX_CHARS}
              rows={3}
              placeholder={copy.guidancePlaceholder}
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
          {props.submitLabel || copy.createStory}
        </button>
      </div>

      {whoOpen ? (
        <QuietSheet title={copy.whoTitle} closeLabel={copy.close} onClose={() => setWhoOpen(false)}>
          <label className="createSheet__field">
            <span className="createScreen__label">{copy.childName}</span>
            <input
              value={props.mainCharacterName}
              onChange={(event) => props.onMainCharacterNameChange(event.target.value)}
              placeholder={copy.childName}
              aria-label={copy.childName}
              autoComplete="off"
            />
          </label>
          <div className="createScreen__label">{copy.age}</div>
          <div className="createSheet__chips" role="listbox" aria-label={copy.age}>
            {STORY_AGE_OPTIONS.map((age) => (
              <button
                key={age}
                type="button"
                className={`createSheet__chip${props.age === age ? " createSheet__chip--on" : ""}`}
                aria-pressed={props.age === age}
                onClick={() => props.onAgeChange(age)}
              >
                {messages.ages[age as keyof typeof messages.ages] || age}
              </button>
            ))}
          </div>
          <div className="createScreen__label">{copy.childKind}</div>
          <div className="createSheet__chips" role="listbox" aria-label={copy.childKind}>
            {GENDERS.map((gender) => (
              <button
                key={gender.value}
                type="button"
                className={`createSheet__chip${props.childGender === gender.value ? " createSheet__chip--on" : ""}`}
                aria-pressed={props.childGender === gender.value}
                onClick={() => props.onChildGenderChange(gender.value)}
              >
                {gender.value === "girl" ? copy.girl : gender.value === "boy" ? copy.boy : gender.value === "nonbinary" ? copy.other : copy.any}
              </button>
            ))}
          </div>
          {props.kids.length || props.characters.length ? (
            <>
              <div className="createScreen__label">{copy.saved}</div>
              <div className="createSheet__chips" aria-label="Saved kids and characters">
                {props.kids.map((kid) => (
                  <button
                    key={kid.id}
                    type="button"
                    className={`createSheet__chip${props.mainCharacterName === kid.name ? " createSheet__chip--on" : ""}`}
                    onClick={() => {
                      props.onSelectKid?.(kid);
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
                      props.onSelectCharacter?.(character);
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
              + {copy.addKid}
            </button>
            <button
              type="button"
              className="createSheet__chip"
              onClick={() => {
                setWhoOpen(false);
                props.onAddCharacter();
              }}
            >
              + {copy.addCharacter}
            </button>
          </div>
        </QuietSheet>
      ) : null}

      {voiceOpen ? (
        <QuietSheet title={addingVoice ? copy.makeVoiceTitle : copy.readBy} closeLabel={copy.close} onClose={closeVoiceSheet}>
          {addingVoice ? (
            <AddMyVoiceFlow
              language={props.language}
              personalVoices={props.personalVoices || "sign-in-required"}
              preview={preview}
              onClose={() => {
                preview.stop();
                if (addingFromCard) closeVoiceSheet();
                else setAddingVoice(false);
              }}
              onCreated={(voiceId, selectable) => {
                closeVoiceSheet();
                props.onVoiceCreated?.(voiceId, selectable);
                if (selectable) props.onVoiceChange(voiceId);
              }}
            />
          ) : (
            <>
              {props.voiceNotice ? <p className="voiceNote">{props.voiceNotice}</p> : null}
              {props.personalNote ? <p className="voiceNote">{props.personalNote}</p> : null}
              {props.voicesError ? (
                <div className="fieldErrorRow" role="alert">
                  <span className="fieldErrorText">{props.voicesError}</span>
                  {props.onRetryVoices ? (
                    <button className="createLink" type="button" onClick={props.onRetryVoices}>
                      {copy.retryVoices}
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <VoiceGroup
                    title={copy.storyVoices}
                    voices={voiceChoices.filter((voice) => voice.group !== "mine")}
                    selectedVoiceId={props.selectedVoiceId}
                    language={props.language}
                    preview={preview}
                    onSelect={(id) => {
                      props.onVoiceChange(id);
                      closeVoiceSheet();
                    }}
                  />
                  <VoiceGroup
                    title={copy.myVoices}
                    voices={props.voices.filter((voice) => voice.group === "mine")}
                    selectedVoiceId={props.selectedVoiceId}
                    language={props.language}
                    preview={preview}
                    empty={copy.emptyMine}
                    onSelect={(id) => {
                      props.onVoiceChange(id);
                      closeVoiceSheet();
                    }}
                    onRename={(voice) => {
                      setRenameId(voice.id);
                      setRenameValue(voice.name || "");
                    }}
                    onDelete={(voice) => {
                      setDeleteId(voice.id);
                      setDeleteAudio(false);
                    }}
                  />
                  {renameId ? (
                    <form
                      className="voiceManage"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void manageVoice("PATCH", renameId, { name: renameValue }, () => setRenameId(""));
                      }}
                    >
                      <label className="createTouch__field">
                        <span className="createScreen__label">{copy.renameTitle}</span>
                        <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
                      </label>
                      {manageError ? (
                        <div className="fieldErrorRow" role="alert">
                          <span className="fieldErrorText">{manageError}</span>
                        </div>
                      ) : null}
                      <button type="submit" className="createScreen__submit" disabled={manageBusy || !renameValue.trim()}>
                        {copy.saveName}
                      </button>
                    </form>
                  ) : null}
                  {deleteId ? (
                    <div className="voiceManage">
                      <h3 className="voiceFlow__title">{copy.deleteTitle}</h3>
                      <p>{copy.deleteBody}</p>
                      <HappyHorseCheck checked={deleteAudio} label={copy.deleteAlso} onChange={setDeleteAudio} />
                      {manageError ? (
                        <div className="fieldErrorRow" role="alert">
                          <span className="fieldErrorText">{manageError}</span>
                        </div>
                      ) : null}
                      <div className="voiceFlow__actions">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId("");
                            setManageError("");
                          }}
                        >
                          {copy.cancel}
                        </button>
                        <button
                          type="button"
                          className="createScreen__submit"
                          disabled={manageBusy}
                          onClick={() => {
                            void manageVoice("DELETE", deleteId, { deleteGeneratedAudio: deleteAudio }, () => setDeleteId(""));
                          }}
                        >
                          {copy.confirmDelete}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
              <button
                type="button"
                className="createLink createLink--touch"
                onClick={() => {
                  preview.stop();
                  setAddingVoice(true);
                }}
              >
                {copy.add}
              </button>
              <p className="createRow__meta">{copy.narrationLine}</p>
            </>
          )}
        </QuietSheet>
      ) : null}
    </div>
  );
}

function voiceSpeaks(voice: VoiceItem, language: string) {
  const group = language.toLowerCase().startsWith("zh") ? "zh" : "en";
  const langs = voice.languages?.length ? voice.languages : [voice.language || "en"];
  return langs.some((item) => item.toLowerCase().startsWith(group));
}

function voiceStatusLabel(voice: VoiceItem, copy: { voiceReady: string; voicePending: string; voiceDeleting: string }) {
  if (voice.status === "pending_verification") return copy.voicePending;
  if (voice.status === "deleting" || voice.status === "delete_failed") return copy.voiceDeleting;
  return copy.voiceReady;
}

/**
 * Sits above the narrator row. Without a personal voice it is the Make my voice card, which opens consent and
 * recording. With one, it shows that voice, whether it is ready, Preview, Change, and Add another.
 */
function MyVoiceCard(props: {
  mine: VoiceItem[];
  selectedVoiceId: string;
  language: string;
  voiceLimit: number | null;
  preview: VoicePreviewControls;
  onMake: () => void;
  onChange: () => void;
  onUse: (id: string) => void;
}) {
  const { messages } = useInterfaceLocale();
  const copy = messages.voice;
  const shown =
    props.mine.find((voice) => voice.id === props.selectedVoiceId) ??
    props.mine.find((voice) => voice.selectable !== false) ??
    props.mine[0];

  if (!shown) {
    return (
      <button type="button" className="makeVoice" onClick={props.onMake} aria-haspopup="dialog">
        <span className="makeVoice__icon" aria-hidden>
          <IconMic className="makeVoice__mic" />
        </span>
        <span className="makeVoice__text">
          <span className="makeVoice__title">{copy.makeVoiceTitle}</span>
          <span className="makeVoice__body">{copy.makeVoiceBody}</span>
        </span>
        <IconChevron className="makeVoice__chevron" />
      </button>
    );
  }

  const ready = shown.selectable !== false && shown.status !== "pending_verification" && shown.status !== "deleting";
  const selected = shown.id === props.selectedVoiceId;
  const atLimit = props.voiceLimit != null && props.mine.length >= props.voiceLimit;
  const name = shown.name || copy.defaultVoiceName;
  return (
    <section className="myVoice" aria-labelledby="my-voice-name">
      <div className="myVoice__head">
        <span className="makeVoice__icon" aria-hidden>
          <IconMic className="makeVoice__mic" />
        </span>
        <span className="myVoice__text">
          <span className="myVoice__eyebrow">{copy.yourVoice}</span>
          <span id="my-voice-name" className="myVoice__name">
            {name}
            {shown.testVoice ? <span className="voiceCard__test">{messages.localTest.voice}</span> : null}
          </span>
          <span className={`myVoice__status${ready ? " myVoice__status--ready" : ""}`}>
            <span className="myVoice__dot" aria-hidden />
            {voiceStatusLabel(shown, copy)}
            {selected ? ` · ${copy.selected}` : ""}
          </span>
        </span>
      </div>
      <div className="myVoice__actions">
        {ready ? <VoicePreviewButton voiceId={shown.id} name={name} language={props.language} preview={props.preview} /> : null}
        {ready && !selected ? (
          <button type="button" className="myVoice__action myVoice__action--primary" onClick={() => props.onUse(shown.id)}>
            {copy.useVoice}
          </button>
        ) : null}
        <button type="button" className="myVoice__action" onClick={props.onChange} aria-haspopup="dialog">
          {copy.change}
        </button>
        <button
          type="button"
          className="myVoice__action"
          onClick={props.onMake}
          disabled={atLimit}
          aria-haspopup="dialog"
          aria-describedby={atLimit ? "my-voice-limit" : undefined}
        >
          {copy.addAnother}
        </button>
      </div>
      <VoicePreviewError voiceId={shown.id} preview={props.preview} />
      {atLimit ? (
        <p id="my-voice-limit" className="myVoice__note">
          {fill(copy.voiceLimitReached, { count: String(props.voiceLimit) })}
        </p>
      ) : null}
    </section>
  );
}

function VoiceGroup(props: {
  title: string;
  voices: VoiceItem[];
  selectedVoiceId: string;
  language: string;
  preview: VoicePreviewControls;
  empty?: string;
  onSelect: (id: string) => void;
  onRename?: (voice: VoiceItem) => void;
  onDelete?: (voice: VoiceItem) => void;
}) {
  const { messages } = useInterfaceLocale();
  const copy = messages.voice;
  return (
    <section className="voiceGroup">
      <h3 className="createScreen__label">{props.title}</h3>
      {props.voices.length ? (
        <div className="createSheet__list" role="listbox" aria-label={props.title}>
          {props.voices.map((voice) => {
            const selected = props.selectedVoiceId === voice.id;
            const pendingVerification = voice.status === "pending_verification";
            const pendingAudition = voice.status === "pending_audition" || voice.nonNativeRisk;
            const ready = voice.selectable !== false && !pendingVerification && !pendingAudition;
            return (
              <div key={voice.id} className={`voiceCard${selected ? " voiceCard--on" : ""}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="voiceCard__main"
                  disabled={!ready}
                  onClick={() => props.onSelect(voice.id)}
                >
                  <span className="voiceCard__name">
                    {selected ? <span className="voiceCard__mark" aria-hidden>✓</span> : null}
                    {voice.name || voiceSummary(voice, props.language)}
                    {voice.testVoice ? <span className="voiceCard__test">{messages.localTest.voice}</span> : null}
                  </span>
                  <span className="voiceCard__desc">{voice.description}</span>
                  {selected ? <span className="voiceCard__selected">{copy.selected}</span> : null}
                  {pendingVerification ? <span className="voiceCard__selected">{copy.pending}</span> : null}
                  {pendingAudition ? <span className="voiceCard__selected">{copy.pendingAudition}</span> : null}
                </button>
                {props.onRename && voice.group === "mine" ? (
                  <button type="button" className="voiceCard__preview" onClick={() => props.onRename?.(voice)}>
                    {copy.rename}
                  </button>
                ) : null}
                {props.onDelete && voice.group === "mine" ? (
                  <button type="button" className="voiceCard__preview" onClick={() => props.onDelete?.(voice)}>
                    {copy.delete}
                  </button>
                ) : null}
                {pendingVerification || voice.status === "deleting" || voice.status === "delete_failed" ? null : (
                  <VoicePreviewButton
                    voiceId={voice.id}
                    name={voice.name || ""}
                    language={props.language}
                    preview={props.preview}
                    className="voiceCard__preview"
                  />
                )}
                <VoicePreviewError voiceId={voice.id} preview={props.preview} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="createRow__meta">{props.empty || ""}</p>
      )}
    </section>
  );
}
