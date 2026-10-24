"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/app/page.css";
import { StoryForm } from "@/app/components/StoryForm";
import { AppChromeBar } from "@/app/components/AppChromeBar";
import { StoryOutput } from "@/app/components/StoryOutput";
import { TtsControls } from "@/app/components/TtsControls";
import { StoryResultActions } from "@/app/components/StoryResultActions";
import { LibraryPanel } from "@/app/components/LibraryPanel";
import { HomeScreenPanel } from "@/app/components/HomeScreenPanel";
import { CreateHubPanel } from "@/app/components/CreateHubPanel";
import { ProfilePanel } from "@/app/components/ProfilePanel";
import { StorySetupExtras } from "@/app/components/StorySetupExtras";
import { KidProfileFormModal } from "@/app/components/KidProfileFormModal";
import { CharacterFormModal } from "@/app/components/CharacterFormModal";
import { HomeTabBar, type HomeTabId } from "@/app/components/HomeTabBar";
import { PosterFlashCard } from "@/app/components/PosterFlashCard";
import { PlaybackPanel } from "@/app/components/PlaybackPanel";
import { EntryScreen } from "@/app/components/EntryScreen";
import { OnboardingFlow } from "@/app/components/OnboardingFlow";
import { useStoryGeneration } from "@/app/hooks/useStoryGeneration";
import { useStoryLibrary } from "@/app/hooks/useStoryLibrary";
import { useTts } from "@/app/hooks/useTts";
import { useKidProfiles } from "@/app/hooks/useKidProfiles";
import { useStoryCharacters } from "@/app/hooks/useStoryCharacters";
import { useReadingStats } from "@/app/hooks/useReadingStats";
import { createStoryPoster } from "@/lib/posters/poster";
import type { PosterCreateOutcome } from "@/lib/posters/poster";
import { getErrorMessage } from "@/lib/errors";
import { trackEvent } from "@/lib/analytics";
import { rememberLastAudio } from "@/lib/audio/lastAudio";
import type { AppBannerError, AppBannerSource } from "@/lib/types";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import { normalizeChildGenderForStoryInput } from "@/lib/profiles/childGender";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profiles/profilesTypes";
import {
  loadOnboardingState,
  saveOnboardingState,
  type OnboardingIntent,
} from "@/lib/profiles/localProfilesStorage";

export type HomeUiMode = "responsive" | "mobile" | "desktop";

type PosterPreviewState = {
  imageUrl: string;
  title: string;
  outcome: PosterCreateOutcome;
  blob: Blob;
  fallbackHint?: string;
};

type CreatePhase = "hub" | "story";

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
  const [age, setAge] = useState("6 months");
  const [language, setLanguage] = useState("zh-Hant");
  const [mainCharacterName, setMainCharacterName] = useState("嚕嚕");
  const [childGender, setChildGender] = useState("any");
  const [genre, setGenre] = useState("Animals");
  const [length, setLength] = useState("short");
  const [title, setTitle] = useState("");
  const [storyInput, setStoryInput] = useState("");
  const [theme, setTheme] = useState("");
  const [mood, setMood] = useState("");
  const [seriesMode, setSeriesMode] = useState<"one_shot" | "series">("one_shot");
  const [educationalGoal, setEducationalGoal] = useState("");
  const [moralLesson, setMoralLesson] = useState("");
  const [speed, setSpeed] = useState(0.95);
  const [emotion, setEmotion] = useState(40);
  const [isMakingPoster, setIsMakingPoster] = useState(false);
  const [linkedStoryId, setLinkedStoryId] = useState<string | null>(null);
  const [banner, setBanner] = useState<AppBannerError | null>(null);
  const [showEntry, setShowEntry] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTabId>("home");
  const [createPhase, setCreatePhase] = useState<CreatePhase>("hub");
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);
  const [selectedProfileSummary, setSelectedProfileSummary] = useState("No profile selected yet.");
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [posterPreview, setPosterPreview] = useState<PosterPreviewState | null>(null);
  const posterPreviewUrlRef = useRef<string | null>(null);

  const { story, setStory, isGenerating, generateStory } = useStoryGeneration();
  const {
    library,
    loadingLibrary,
    libraryError,
    setLibraryError,
    isSaving,
    refreshLibrary,
    saveStory,
    savePosterForStory,
    deleteStory,
  } = useStoryLibrary();
  const {
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
    audioUrl,
    audioRef,
    isMakingMp3,
    isLoadingVoices,
    voicesError,
    fetchVoices,
    makeMp3,
    playSavedAudio,
    clearAudio,
    registerClonedVoice,
    clearClonedVoice,
    hasClonedVoice,
  } = useTts(language);

  const { profiles: kids, add: addKid } = useKidProfiles();
  const { characters, add: addCharacter } = useStoryCharacters();
  const { stats, onStoryPlayed, setDraftSummary } = useReadingStats();

  const canContinueReading = useMemo(
    () => Boolean(stats?.lastStoryId && library.some((i) => i.id === stats.lastStoryId)),
    [stats?.lastStoryId, library]
  );

  useEffect(() => {
    void refreshLibrary();
    void fetchVoices();
    const onboarding = loadOnboardingState();
    setShowOnboarding(!onboarding.completed);
    applyOnboardingIntent(onboarding.selectedIntent ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, selectedVoiceId]);

  useEffect(() => {
    return () => {
      if (posterPreviewUrlRef.current) {
        URL.revokeObjectURL(posterPreviewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const line =
      story.trim() || title.trim()
        ? `${title.trim() || "Untitled"} · ${genre}${story.trim() ? " · draft" : ""}`
        : null;
    setDraftSummary(line);
  }, [title, genre, story, setDraftSummary]);

  function dismissPosterPreview() {
    if (posterPreviewUrlRef.current) {
      URL.revokeObjectURL(posterPreviewUrlRef.current);
      posterPreviewUrlRef.current = null;
    }
    setPosterPreview(null);
  }

  const applyKidProfile = useCallback((k: KidProfile) => {
    setAge(k.age);
    setMainCharacterName(k.name);
    setChildGender(k.gender === "boy" ? "boy" : k.gender === "girl" ? "girl" : "nonbinary");
    const base = k.interests.length ? `Interests: ${k.interests.join(", ")}` : "";
    setStoryInput(base.slice(0, STORY_INPUT_MAX_CHARS));
    setCreatePhase("story");
    setSelectedProfileSummary(`${k.name} · ${k.age}${k.interests.length ? ` · ${k.interests.slice(0, 2).join(", ")}` : ""}`);
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
    setCreatePhase("story");
    setSelectedProfileSummary(`${c.name}${c.characterType ? ` · ${c.characterType}` : ""}`);
  }, []);

  async function persistStory(text: string, existingId: string | null) {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Generate a story first.");
    const saved = await saveStory({
      age,
      language,
      mainCharacterName,
      childGender,
      genre,
      length,
      title: title.trim() || `${mainCharacterName.trim() || "Bedtime"} story`,
      story: trimmed,
      id: existingId,
    });
    const sid = saved && typeof saved.id === "string" ? saved.id : null;
    if (sid) setLinkedStoryId(sid);
    return sid;
  }

  async function onGenerate(mode: "new" | "replace" = "new") {
    setBanner(null);
    const updateId = mode === "replace" ? linkedStoryId : null;
    if (mode === "new") setLinkedStoryId(null);
    const guidance = buildGuidance(storyInput, theme, mood, seriesMode, educationalGoal, moralLesson);
    try {
      const text = await generateStory({
        age,
        language,
        mainCharacterName,
        childGender,
        genre,
        length,
        title,
        storyInput: guidance,
      });
      if (!text.trim()) {
        setBanner({ source: "story", message: "The story came back empty. Try again." });
        return;
      }
      trackEvent("story_generated", { genre, length, language });
      try {
        const sid = await persistStory(text, updateId);
        if (!sid) {
          setBanner({
            source: "save",
            message: "The story was written but could not be saved. Tap Try again.",
          });
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

  async function onSave() {
    setBanner(null);
    try {
      const sid = await persistStory(story, linkedStoryId);
      if (!sid) throw new Error("Could not save this story.");
      trackEvent("story_saved");
    } catch (e: unknown) {
      setBanner({
        source: "save",
        message: getErrorMessage(e, "Failed to save."),
      });
    }
  }

  async function onMakeMp3() {
    setBanner(null);
    try {
      const sid = await persistStory(story, linkedStoryId);
      const result = await makeMp3(story, speed, emotion, language, sid ?? undefined);
      if (result.savedAudioUrl) {
        rememberLastAudio(result.savedAudioUrl, title.trim() || mainCharacterName.trim() || "Story");
        void refreshLibrary();
      } else if (sid) {
        setBanner({
          source: "tts",
          message: "Narration is ready, but it could not be saved on this story. Tap Try again.",
        });
      }
    } catch (e: unknown) {
      setBanner({
        source: "tts",
        message: getErrorMessage(e, "Voice failed, try again."),
      });
    }
  }

  async function onPlayLibraryStory(item: StoryLibraryItem) {
    setBanner(null);
    const label = item.title?.trim() || "Story";
    try {
      if (item.audioUrl) {
        await playSavedAudio(item.audioUrl);
        rememberLastAudio(item.audioUrl, label);
        onStoryPlayed(item.id, label);
        trackEvent("library_play", { storyId: item.id, source: "saved" });
        return;
      }
      const lang = item.language?.trim() || language;
      const result = await makeMp3(item.story, speed, emotion, lang, item.id);
      if (result.savedAudioUrl) {
        rememberLastAudio(result.savedAudioUrl, label);
        void refreshLibrary();
      } else {
        setBanner({
          source: "tts",
          message: "Narration is ready, but it could not be saved on this story. Tap Try again.",
        });
      }
      onStoryPlayed(item.id, label);
      trackEvent("library_play", { storyId: item.id });
    } catch (e: unknown) {
      setBanner({
        source: "tts",
        message: getErrorMessage(e, "Voice failed, try again."),
      });
    }
  }

  async function onDeleteLibraryStory(item: StoryLibraryItem) {
    setBanner(null);
    try {
      await deleteStory(item.id);
      if (linkedStoryId === item.id) {
        setLinkedStoryId(null);
      }
    } catch (e: unknown) {
      setBanner({
        source: "save",
        message: getErrorMessage(e, "Could not delete this story."),
      });
    }
  }

  async function onCreatePosterFromLibrary(item: StoryLibraryItem) {
    setBanner(null);
    setIsMakingPoster(true);
    try {
      const { outcome, blob, fallbackReason } = await createStoryPoster({
        title: item.title ?? "",
        story: item.story ?? "",
        genre: item.genre ?? "",
      });
      if (posterPreviewUrlRef.current) {
        URL.revokeObjectURL(posterPreviewUrlRef.current);
        posterPreviewUrlRef.current = null;
      }
      const imageUrl = URL.createObjectURL(blob);
      posterPreviewUrlRef.current = imageUrl;
      setPosterPreview({
        imageUrl,
        title: item.title?.trim() || "Bedtime Story",
        outcome,
        blob,
        fallbackHint: outcome === "text_fallback" ? fallbackReason : undefined,
      });
      if (item.id) {
        await savePosterForStory(item.id, blob);
      }
    } catch (e: unknown) {
      setBanner({
        source: "poster",
        message: getErrorMessage(e, "Poster could not be created."),
      });
    } finally {
      setIsMakingPoster(false);
    }
  }

  async function onCreatePoster() {
    setIsMakingPoster(true);
    setBanner(null);
    try {
      let sid: string | null = null;
      try {
        sid = await persistStory(story, linkedStoryId);
      } catch (e: unknown) {
        setBanner({
          source: "save",
          message: getErrorMessage(e, "Save the story before creating a poster."),
        });
        return;
      }
      if (!sid) {
        setBanner({
          source: "save",
          message: "Save the story before creating a poster.",
        });
        return;
      }
      const { outcome, blob, fallbackReason } = await createStoryPoster({ title, story, genre });
      trackEvent("poster_created", { layout: outcome, textFallback: outcome === "text_fallback" });
      if (posterPreviewUrlRef.current) {
        URL.revokeObjectURL(posterPreviewUrlRef.current);
        posterPreviewUrlRef.current = null;
      }
      const imageUrl = URL.createObjectURL(blob);
      posterPreviewUrlRef.current = imageUrl;
      setPosterPreview({
        imageUrl,
        title: title.trim() || "Bedtime Story",
        outcome,
        blob,
        fallbackHint: outcome === "text_fallback" ? fallbackReason : undefined,
      });
      try {
        await savePosterForStory(sid, blob);
        trackEvent("poster_saved", { storyId: sid });
      } catch (e: unknown) {
        console.warn("[poster] file save failed", e);
        setBanner({
          source: "poster",
          message: getErrorMessage(e, "Poster was created but could not be saved to your library. Tap Try again."),
        });
      }
    } catch (e: unknown) {
      setBanner({
        source: "poster",
        message: getErrorMessage(e, "Poster could not be created."),
      });
    } finally {
      setIsMakingPoster(false);
    }
  }

  function retryBanner() {
    if (!banner) return;
    const source = banner.source;
    setBanner(null);
    if (source === "story") void onGenerate();
    else if (source === "save") void onSave();
    else if (source === "tts") void onMakeMp3();
    else if (source === "poster") void onCreatePoster();
  }

  const bannerRetryBusy =
    banner?.source === "story"
      ? isGenerating
      : banner?.source === "save"
        ? isSaving
        : banner?.source === "tts"
          ? isMakingMp3
          : banner?.source === "poster"
            ? isMakingPoster
            : false;

  function onLoadLibraryItem(item: StoryLibraryItem) {
    setLinkedStoryId(item.id || null);
    setStory(item.story ?? "");
    setTitle(item.title ?? "");
    setGenre(item.genre ?? "Animals");
    setAge(item.age ?? "6 months");
    setLanguage(item.language ?? "zh-Hant");
    setMainCharacterName(item.mainCharacterName ?? "嚕嚕");
    setChildGender(normalizeChildGenderForStoryInput(item.childGender));
    setSelectedProfileSummary(item.mainCharacterName?.trim() ? `${item.mainCharacterName} · from library` : "Loaded from library");
  }

  function onOpenStoryInEditor(item: StoryLibraryItem) {
    onLoadLibraryItem(item);
    setActiveTab("create");
    setCreatePhase("story");
  }

  function handleContinueReading() {
    const id = stats?.lastStoryId;
    if (!id) return;
    const item = library.find((i) => i.id === id);
    if (item) {
      onLoadLibraryItem(item);
      setActiveTab("create");
      setCreatePhase("story");
    }
  }

  function applyOnboardingIntent(intent: OnboardingIntent | null) {
    if (intent === "create_story") {
      setActiveTab("create");
      setCreatePhase("hub");
      setShowAdvancedSetup(false);
      return;
    }
    if (intent === "build_kid_profile") {
      setActiveTab("create");
      setCreatePhase("hub");
      setShowAdvancedSetup(false);
      setKidModalOpen(true);
      return;
    }
    if (intent === "create_character") {
      setActiveTab("create");
      setCreatePhase("hub");
      setShowAdvancedSetup(false);
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

  const rootClass = ["pageRoot", "pageRoot--tabs", uiMode === "mobile" && "pageRoot--uiMobile", uiMode === "desktop" && "pageRoot--uiDesktop"]
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
            saveOnboardingState({
              completed: true,
              skippedCreateKid,
              selectedIntent: intent,
              consentedToVoice: false,
            });
            setShowOnboarding(false);
            applyOnboardingIntent(intent);
          }}
        />
      ) : null}
      <main className={rootClass}>
        <div className="overlay overlay--withTabs">
          <div className="container">
            <AppChromeBar />
            <div className={audioUrl || isMakingMp3 ? undefined : "visuallyHidden"}>
              <PlaybackPanel audioRef={audioRef} audioUrl={audioUrl} isPreparing={isMakingMp3} />
            </div>
            <header>
              {activeTab === "create" && createPhase === "hub" ? (
                <>
                  <div className="title">Create</div>
                  <div className="subtitle">
                    Start with <strong>Create with My Kid</strong> or <strong>Create with a Story Character</strong>, then
                    move on to story setup.
                  </div>
                </>
              ) : null}
              {activeTab === "create" && createPhase === "story" ? (
                <>
                  <div className="createStoryHeader">
                    <button
                      type="button"
                      className="button createStoryHeader__back"
                      onClick={() => {
                        setCreatePhase("hub");
                        setShowAdvancedSetup(false);
                      }}
                    >
                      ← Back
                    </button>
                    <div className="title createStoryHeader__title">Story setup</div>
                    <div className="subtitle">Choose genre and length, add optional tone and goals, then generate.</div>
                  </div>
                </>
              ) : null}
              {activeTab === "library" ? (
                <>
                  <div className="title">My Stories</div>
                  <div className="subtitle">Browse, listen, and reopen your saved bedtime stories.</div>
                </>
              ) : null}
            </header>

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
                playBusy={isMakingMp3}
                stats={stats}
                onOpenStory={onOpenStoryInEditor}
                onPlayStory={(item) => void onPlayLibraryStory(item)}
                onContinueReading={handleContinueReading}
                canContinueReading={canContinueReading}
                onQuickCreate={() => {
                  setActiveTab("create");
                  setCreatePhase("hub");
                  setShowAdvancedSetup(false);
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

            {activeTab === "create" && createPhase === "hub" ? (
              <CreateHubPanel
                kids={kids}
                characters={characters}
                onAddKid={() => setKidModalOpen(true)}
                onAddCharacter={() => setCharModalOpen(true)}
                onChooseKid={applyKidProfile}
                onChooseCharacter={applyCharacterProfile}
              />
            ) : null}

            {activeTab === "create" && createPhase === "story" ? (
              <div className="mainGrid mainGrid--storySetup">
                <div className="leftColumnStory">
                  <div className="storySetupSummary">
                    <p className="storySetupSummary__title">Selected profile</p>
                    <p className="storySetupSummary__body">{selectedProfileSummary}</p>
                  </div>
                  <button
                    type="button"
                    className="button storySetupAdvancedToggle"
                    onClick={() => setShowAdvancedSetup((prev) => !prev)}
                  >
                    {showAdvancedSetup ? "Hide advanced setup" : "Show advanced setup"}
                  </button>
                  {showAdvancedSetup ? (
                    <StorySetupExtras
                      theme={theme}
                      mood={mood}
                      seriesMode={seriesMode}
                      educationalGoal={educationalGoal}
                      moralLesson={moralLesson}
                      onThemeChange={setTheme}
                      onMoodChange={setMood}
                      onSeriesModeChange={setSeriesMode}
                      onEducationalGoalChange={setEducationalGoal}
                      onMoralLessonChange={setMoralLesson}
                    />
                  ) : null}
                  <StoryForm
                    age={age}
                    language={language}
                    mainCharacterName={mainCharacterName}
                    childGender={childGender}
                    genre={genre}
                    length={length}
                    title={title}
                    storyInput={storyInput}
                    onAgeChange={setAge}
                    onLanguageChange={setLanguage}
                    onMainCharacterNameChange={setMainCharacterName}
                    onChildGenderChange={setChildGender}
                    onGenreChange={setGenre}
                    onLengthChange={setLength}
                    onTitleChange={setTitle}
                    onStoryInputChange={setStoryInput}
                    voices={voices}
                    selectedVoiceId={selectedVoiceId}
                    onVoiceChange={setSelectedVoiceId}
                    isGenerating={isGenerating}
                    isSaving={isSaving}
                    isMakingMp3={isMakingMp3}
                    hasStory={Boolean(story.trim())}
                    onGenerate={() => void onGenerate("new")}
                    onSave={onSave}
                    onMakeMp3={onMakeMp3}
                    onCreatePoster={onCreatePoster}
                    isMakingPoster={isMakingPoster}
                    isLoadingVoices={isLoadingVoices}
                    voicesError={voicesError}
                    onRetryVoices={() => void fetchVoices()}
                    hasClonedVoice={hasClonedVoice}
                    onRegisterClonedVoice={(voiceId, label) => void registerClonedVoice(voiceId, label)}
                    onClearClonedVoice={() => void clearClonedVoice()}
                    showSecondaryActions={false}
                  />
                </div>

                <div className="rightColumn">
                  <TtsControls speed={speed} emotion={emotion} onSpeedChange={setSpeed} onEmotionChange={setEmotion} />
                  <StoryOutput story={story} isGenerating={isGenerating} />
                  <StoryResultActions
                    hasStory={Boolean(story.trim())}
                    isSaving={isSaving}
                    isMakingMp3={isMakingMp3}
                    isMakingPoster={isMakingPoster}
                    isGenerating={isGenerating}
                    isSaved={Boolean(linkedStoryId)}
                    onPlay={() => void onMakeMp3()}
                    onSave={() => void onSave()}
                    onPoster={() => void onCreatePoster()}
                    onRegenerate={() => void onGenerate("replace")}
                    onEditPrompt={() => setShowAdvancedSetup(true)}
                  />
                </div>
              </div>
            ) : null}

            {activeTab === "library" ? (
              <LibraryPanel
                library={library}
                loadingLibrary={loadingLibrary}
                libraryError={libraryError}
                playBusy={isMakingMp3}
                panelTitle="My Stories"
                onRefresh={() => void refreshLibrary()}
                onDismissLibraryError={() => setLibraryError("")}
                onLoadStory={(item) => {
                  onLoadLibraryItem(item);
                  setActiveTab("create");
                  setCreatePhase("story");
                }}
                onPlayStory={(item) => void onPlayLibraryStory(item)}
                onDeleteStory={(item) => void onDeleteLibraryStory(item)}
                onCreatePoster={(item) => void onCreatePosterFromLibrary(item)}
              />
            ) : null}

            {activeTab === "profile" ? (
              <ProfilePanel
                stats={stats}
                kids={kids}
                characters={characters}
                onGoToCreateHub={() => {
                  setActiveTab("create");
                  setCreatePhase("hub");
                  setShowAdvancedSetup(false);
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

        {posterPreview ? (
          <PosterFlashCard
            imageUrl={posterPreview.imageUrl}
            title={posterPreview.title}
            outcome={posterPreview.outcome}
            blob={posterPreview.blob}
            fallbackHint={posterPreview.fallbackHint}
            onDismiss={dismissPosterPreview}
          />
        ) : null}
      </main>
    </>
  );
}
