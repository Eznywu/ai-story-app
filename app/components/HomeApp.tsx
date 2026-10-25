"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/page.css";
import { AppChromeBar } from "@/app/components/AppChromeBar";
import { CreateStoryPicker } from "@/app/components/CreateStoryPicker";
import { LibraryPanel } from "@/app/components/LibraryPanel";
import { HomeScreenPanel } from "@/app/components/HomeScreenPanel";
import { ProfilePanel } from "@/app/components/ProfilePanel";
import { KidProfileFormModal } from "@/app/components/KidProfileFormModal";
import { CharacterFormModal } from "@/app/components/CharacterFormModal";
import { HomeTabBar, type HomeTabId } from "@/app/components/HomeTabBar";
import { EntryScreen } from "@/app/components/EntryScreen";
import { OnboardingFlow } from "@/app/components/OnboardingFlow";
import { useStoryGeneration } from "@/app/hooks/useStoryGeneration";
import { useStoryLibrary } from "@/app/hooks/useStoryLibrary";
import { useTts } from "@/app/hooks/useTts";
import { useKidProfiles } from "@/app/hooks/useKidProfiles";
import { useStoryCharacters } from "@/app/hooks/useStoryCharacters";
import { useReadingStats } from "@/app/hooks/useReadingStats";
import { getErrorMessage } from "@/lib/errors";
import { trackEvent } from "@/lib/analytics";
import type { AppBannerError, AppBannerSource } from "@/lib/types";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profiles/profilesTypes";
import {
  loadOnboardingState,
  saveOnboardingState,
  type OnboardingIntent,
} from "@/lib/profiles/localProfilesStorage";
import { useAuthUser } from "@/app/components/RequireAuth";

export type HomeUiMode = "responsive" | "mobile" | "desktop";

function bannerSourceLabel(source: AppBannerSource): string {
  switch (source) {
    case "story":
      return "Story";
    case "save":
      return "Save";
    case "tts":
      return "Audio";
    case "poster":
      return "Poster";
  }
}

function buildGuidance(
  base: string,
  theme: string,
  mood: string,
  seriesMode: "one_shot" | "series",
  educationalGoal: string,
  moralLesson: string
): string {
  const parts = [base.trim()];
  if (theme.trim()) parts.push(`Theme: ${theme.trim()}`);
  if (mood.trim()) parts.push(`Mood: ${mood.trim()}`);
  parts.push(
    seriesMode === "series"
      ? "Shape this as one episode that could continue as a gentle series."
      : "Standalone bedtime story."
  );
  if (educationalGoal.trim()) parts.push(`Educational: ${educationalGoal.trim()}`);
  if (moralLesson.trim()) parts.push(`Lesson: ${moralLesson.trim()}`);
  const joined = parts.filter(Boolean).join(" ");
  return joined.length <= STORY_INPUT_MAX_CHARS ? joined : joined.slice(0, STORY_INPUT_MAX_CHARS);
}

type Props = {
  uiMode?: HomeUiMode;
};

export function HomeApp({ uiMode = "responsive" }: Props) {
  const router = useRouter();
  const { user } = useAuthUser();
  const [age, setAge] = useState("6 months");
  const [language, setLanguage] = useState("zh-Hant");
  const [mainCharacterName, setMainCharacterName] = useState("嚕嚕");
  const [childGender, setChildGender] = useState("any");
  const [genre, setGenre] = useState("Animals");
  const [length, setLength] = useState("short");
  const [storyInput, setStoryInput] = useState("");
  const [theme, setTheme] = useState("");
  const [mood, setMood] = useState("");
  const [seriesMode, setSeriesMode] = useState<"one_shot" | "series">("one_shot");
  const [educationalGoal, setEducationalGoal] = useState("");
  const [moralLesson, setMoralLesson] = useState("");
  const [banner, setBanner] = useState<AppBannerError | null>(null);
  const [showEntry, setShowEntry] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTabId>("home");
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [charModalOpen, setCharModalOpen] = useState(false);

  const { isGenerating, generateStory } = useStoryGeneration();
  const {
    library,
    loadingLibrary,
    libraryError,
    setLibraryError,
    isSaving,
    refreshLibrary,
    saveStory,
    deleteStory,
  } = useStoryLibrary();
  const {
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
    isLoadingVoices,
    voicesError,
    fetchVoices,
  } = useTts(language);

  const { profiles: kids, add: addKid } = useKidProfiles();
  const { characters, add: addCharacter } = useStoryCharacters();
  const { stats, setDraftSummary } = useReadingStats();

  const canContinueReading = useMemo(
    () => Boolean(stats?.lastStoryId && library.some((i) => i.id === stats.lastStoryId)),
    [stats?.lastStoryId, library]
  );

  useEffect(() => {
    void refreshLibrary();
    void fetchVoices();
    const tab = new URLSearchParams(window.location.search).get("tab");
    const explicitTab =
      tab === "home" || tab === "create" || tab === "library" || tab === "profile" ? tab : null;
    if (explicitTab) setActiveTab(explicitTab);
    const onboarding = loadOnboardingState(user.id);
    setShowOnboarding(!onboarding.completed);
    // A saved onboarding intent (for example "create a story") must not override
    // an explicit ?tab= link such as the story page's back-to-library control.
    if (!explicitTab) applyOnboardingIntent(onboarding.selectedIntent ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    const line = mainCharacterName.trim() ? `${mainCharacterName.trim()} · ${genre}` : null;
    setDraftSummary(line);
  }, [mainCharacterName, genre, setDraftSummary]);

  function openStory(id: string, play = false) {
    router.push(play ? `/story/${id}?play=1` : `/story/${id}`);
  }

  function onLanguagePick(next: string) {
    setLanguage(next);
    const group = next.toLowerCase().startsWith("zh") ? "zh" : "en";
    const match = voices.find((voice) => (voice.language ?? "en").toLowerCase().startsWith(group));
    if (match) setSelectedVoiceId(match.id);
  }

  const applyKidProfile = useCallback((k: KidProfile) => {
    setAge(k.age);
    setMainCharacterName(k.name);
    setChildGender(k.gender === "boy" ? "boy" : k.gender === "girl" ? "girl" : "nonbinary");
    const base = k.interests.length ? `Interests: ${k.interests.join(", ")}` : "";
    setStoryInput(base.slice(0, STORY_INPUT_MAX_CHARS));
    setActiveTab("create");
  }, []);

  const applyCharacterProfile = useCallback((c: StoryCharacterProfile) => {
    setMainCharacterName(c.name);
    setChildGender("any");
    const parts = [
      c.characterType && `Type: ${c.characterType}`,
      c.personality && `Personality: ${c.personality}`,
      c.skills && `Skills: ${c.skills}`,
      c.themes.length && `Themes: ${c.themes.join(", ")}`,
      c.visualStyle && `Visual style: ${c.visualStyle}`,
    ].filter(Boolean) as string[];
    const packed = parts.join(". ");
    setStoryInput(packed.slice(0, STORY_INPUT_MAX_CHARS));
    setActiveTab("create");
  }, []);

  async function persistStory(text: string) {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Generate a story first.");
    const saved = await saveStory({
      age,
      language,
      mainCharacterName,
      childGender,
      genre,
      length,
      title: `${mainCharacterName.trim() || "Bedtime"} story`,
      story: trimmed,
    });
    return saved && typeof saved.id === "string" ? saved.id : null;
  }

  async function onGenerate() {
    setBanner(null);
    const guidance = buildGuidance(storyInput, theme, mood, seriesMode, educationalGoal, moralLesson);
    try {
      const text = await generateStory({
        age,
        language,
        mainCharacterName,
        childGender,
        genre,
        length,
        title: `${mainCharacterName.trim() || "Bedtime"} story`,
        storyInput: guidance,
      });
      if (!text.trim()) {
        setBanner({ source: "story", message: "The story came back empty. Try again." });
        return;
      }
      trackEvent("story_generated", { genre, length, language });
      try {
        const sid = await persistStory(text);
        if (!sid) {
          setBanner({
            source: "save",
            message: "The story was written but could not be saved. Tap Try again.",
          });
        } else {
          const voiceQuery = selectedVoiceId ? `?voice=${encodeURIComponent(selectedVoiceId)}` : "";
          router.push(`/story/${sid}${voiceQuery}`);
        }
      } catch (e: unknown) {
        setBanner({
          source: "save",
          message: getErrorMessage(e, "The story was written but could not be saved. Tap Try again."),
        });
      }
    } catch (e: unknown) {
      setBanner({
        source: "story",
        message: getErrorMessage(e, "Failed to generate story."),
      });
    }
  }

  function openLibraryStory(item: StoryLibraryItem, play = false) {
    openStory(item.id, play);
  }

  async function onDeleteLibraryStory(item: StoryLibraryItem) {
    setBanner(null);
    try {
      await deleteStory(item.id);
    } catch (e: unknown) {
      setBanner({
        source: "save",
        message: getErrorMessage(e, "Could not delete this story."),
      });
    }
  }

  function retryBanner() {
    if (!banner) return;
    setBanner(null);
    if (banner.source === "story" || banner.source === "save") void onGenerate();
  }

  const bannerRetryBusy = isGenerating || isSaving;

  function handleContinueReading() {
    const id = stats?.lastStoryId;
    if (!id) return;
    openStory(id);
  }

  function applyOnboardingIntent(intent: OnboardingIntent | null) {
    if (intent === "create_story") {
      setActiveTab("create");
      return;
    }
    if (intent === "build_kid_profile") {
      setActiveTab("create");
      setKidModalOpen(true);
      return;
    }
    if (intent === "create_character") {
      setActiveTab("create");
      setCharModalOpen(true);
      return;
    }
    if (intent === "continue_reading") {
      if (canContinueReading) {
        handleContinueReading();
      } else {
        setActiveTab("home");
      }
      return;
    }
    if (intent === "explore_library") {
      setActiveTab("library");
    }
  }

  const rootClass = [
    "pageRoot",
    "pageRoot--tabs",
    activeTab === "create" && "pageRoot--createFit",
    uiMode === "mobile" && "pageRoot--uiMobile",
    uiMode === "desktop" && "pageRoot--uiDesktop",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {showEntry ? <EntryScreen onFinished={() => setShowEntry(false)} /> : null}
      {!showEntry && showOnboarding ? (
        <OnboardingFlow
          onCreateKid={({ name, age, interests }) => {
            const created = addKid({
              name,
              age,
              gender: "other",
              interests,
            });
            applyKidProfile(created);
            setActiveTab("create");
          }}
          onFinish={({ skippedCreateKid, intent }) => {
            saveOnboardingState(
              {
                completed: true,
                skippedCreateKid,
                selectedIntent: intent,
                consentedToVoice: false,
              },
              user.id
            );
            setShowOnboarding(false);
            applyOnboardingIntent(intent);
          }}
        />
      ) : null}
      <main className={rootClass}>
        <div className="overlay overlay--withTabs">
          <div className="container">
            <AppChromeBar />
            {activeTab === "library" ? (
              <header>
                <div className="title">My Stories</div>
                <div className="subtitle">Browse, listen, and reopen your saved bedtime stories.</div>
              </header>
            ) : null}

            {banner ? (
              <div className="errorBox" role="alert">
                <span className="errorText">
                  <span className="errorSource">{bannerSourceLabel(banner.source)}: </span>
                  {banner.message}
                </span>
                <div className="errorActions">
                  <button
                    className="button errorRetry"
                    type="button"
                    onClick={retryBanner}
                    disabled={bannerRetryBusy}
                  >
                    Try again
                  </button>
                  <button
                    className="button errorDismiss"
                    type="button"
                    onClick={() => setBanner(null)}
                    disabled={bannerRetryBusy}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === "home" ? (
              <HomeScreenPanel
                library={library}
                loadingLibrary={loadingLibrary}
                playBusy={false}
                stats={stats}
                onOpenStory={(item) => openLibraryStory(item)}
                onPlayStory={(item) => openLibraryStory(item, true)}
                onContinueReading={handleContinueReading}
                canContinueReading={canContinueReading}
                onQuickCreate={() => {
                  setActiveTab("create");
                }}
                onAddKid={() => {
                  setActiveTab("create");
                  setKidModalOpen(true);
                }}
                onAddCharacter={() => {
                  setActiveTab("create");
                  setCharModalOpen(true);
                }}
              />
            ) : null}

            {activeTab === "create" ? (
              <CreateStoryPicker
                kids={kids}
                characters={characters}
                age={age}
                language={language}
                mainCharacterName={mainCharacterName}
                childGender={childGender}
                genre={genre}
                length={length}
                storyInput={storyInput}
                theme={theme}
                mood={mood}
                seriesMode={seriesMode}
                educationalGoal={educationalGoal}
                moralLesson={moralLesson}
                voices={voices}
                selectedVoiceId={selectedVoiceId}
                isLoadingVoices={isLoadingVoices}
                voicesError={voicesError}
                isGenerating={isGenerating}
                onAgeChange={setAge}
                onLanguageChange={onLanguagePick}
                onMainCharacterNameChange={setMainCharacterName}
                onChildGenderChange={setChildGender}
                onGenreChange={setGenre}
                onLengthChange={setLength}
                onStoryInputChange={setStoryInput}
                onThemeChange={setTheme}
                onMoodChange={setMood}
                onSeriesModeChange={setSeriesMode}
                onEducationalGoalChange={setEducationalGoal}
                onMoralLessonChange={setMoralLesson}
                onVoiceChange={setSelectedVoiceId}
                onRetryVoices={() => void fetchVoices()}
                onAddKid={() => setKidModalOpen(true)}
                onAddCharacter={() => setCharModalOpen(true)}
                onCreate={() => void onGenerate()}
              />
            ) : null}

            {activeTab === "library" ? (
              <LibraryPanel
                library={library}
                loadingLibrary={loadingLibrary}
                libraryError={libraryError}
                playBusy={false}
                panelTitle="My Stories"
                onRefresh={() => void refreshLibrary()}
                onDismissLibraryError={() => setLibraryError("")}
                onLoadStory={(item) => openLibraryStory(item)}
                onPlayStory={(item) => openLibraryStory(item, true)}
                onDeleteStory={(item) => void onDeleteLibraryStory(item)}
                onCreatePoster={(item) => openLibraryStory(item)}
              />
            ) : null}

            {activeTab === "profile" ? (
              <ProfilePanel
                email={user.email}
                stats={stats}
                kids={kids}
                characters={characters}
                onGoToCreateHub={() => {
                  setActiveTab("create");
                }}
              />
            ) : null}

            {!showEntry ? (
              <footer className="legalFooter">
                <a href="/legal/privacy">Privacy</a>
                <span aria-hidden="true"> · </span>
                <a href="/legal/terms">Terms</a>
              </footer>
            ) : null}
          </div>
        </div>

        <HomeTabBar active={activeTab} onChange={setActiveTab} />

        <KidProfileFormModal
          open={kidModalOpen}
          onClose={() => setKidModalOpen(false)}
          onSave={(p) => {
            const created = addKid(p);
            applyKidProfile(created);
            setKidModalOpen(false);
          }}
        />
        <CharacterFormModal
          open={charModalOpen}
          onClose={() => setCharModalOpen(false)}
          onSave={(c) => {
            const created = addCharacter(c);
            applyCharacterProfile(created);
            setCharModalOpen(false);
          }}
        />
      </main>
    </>
  );
}
