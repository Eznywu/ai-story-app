"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/app/page.css";
import { StoryForm } from "@/app/components/StoryForm";
import { AppChromeBar } from "@/app/components/AppChromeBar";
import { StoryOutput } from "@/app/components/StoryOutput";
import { TtsControls } from "@/app/components/TtsControls";
import { LibraryPanel } from "@/app/components/LibraryPanel";
import { HomeScreenPanel } from "@/app/components/HomeScreenPanel";
import { CreateHubPanel } from "@/app/components/CreateHubPanel";
import { ProfilePanel } from "@/app/components/ProfilePanel";
import { StorySetupExtras } from "@/app/components/StorySetupExtras";
import { KidProfileFormModal } from "@/app/components/KidProfileFormModal";
import { CharacterFormModal } from "@/app/components/CharacterFormModal";
import { HomeTabBar, type HomeTabId } from "@/app/components/HomeTabBar";
import { PosterFlashCard } from "@/app/components/PosterFlashCard";
import { EntryScreen } from "@/app/components/EntryScreen";
import { useStoryGeneration } from "@/app/hooks/useStoryGeneration";
import { useStoryLibrary } from "@/app/hooks/useStoryLibrary";
import { useTts } from "@/app/hooks/useTts";
import { useAuth } from "@/app/hooks/useAuth";
import { isDefaultStoryText } from "@/lib/defaultStory";
import { useKidProfiles } from "@/app/hooks/useKidProfiles";
import { useStoryCharacters } from "@/app/hooks/useStoryCharacters";
import { useReadingStats } from "@/app/hooks/useReadingStats";
import { createStoryPoster } from "@/lib/poster";
import type { PosterCreateOutcome } from "@/lib/poster";
import { getErrorMessage } from "@/lib/errors";
import { trackEvent } from "@/lib/analytics";
import type { AppBannerError, AppBannerSource } from "@/lib/types";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profilesTypes";

export type HomeUiMode = "responsive" | "mobile" | "desktop";

type PosterPreviewState = {
  imageUrl: string;
  title: string;
  outcome: PosterCreateOutcome;
  blob: Blob;
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
  const [activeTab, setActiveTab] = useState<HomeTabId>("home");
  const [createPhase, setCreatePhase] = useState<CreatePhase>("hub");
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [posterPreview, setPosterPreview] = useState<PosterPreviewState | null>(null);
  const posterPreviewUrlRef = useRef<string | null>(null);

  const { loading: authLoading, auth, login, logout, joinMembership } = useAuth();
  const member = auth?.member ?? false;

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
    void fetchVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void refreshLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, member]);

  useEffect(() => {
    if (authLoading || !auth) return;
    if (!member) {
      setTitle(auth.defaultStory.title);
      setStory(auth.defaultStory.text);
    }
  }, [authLoading, member, auth?.defaultStory.text, auth?.defaultStory.title]);

  const canPlayNarration = useMemo(() => member || isDefaultStoryText(story), [member, story]);

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
  }, []);

  async function onGenerate() {
    if (!member) return;
    setBanner(null);
    setLinkedStoryId(null);
    const guidance = buildGuidance(storyInput, theme, mood, seriesMode, educationalGoal, moralLesson);
    try {
      await generateStory({
        age,
        language,
        mainCharacterName,
        childGender,
        genre,
        length,
        title,
        storyInput: guidance,
      });
      trackEvent("story_generated", { genre, length, language });
    } catch (e: unknown) {
      setBanner({
        source: "story",
        message: getErrorMessage(e, "Failed to generate story."),
      });
    }
  }

  async function onSave() {
    if (!member) return;
    setBanner(null);
    try {
      const saved = await saveStory({
        age,
        language,
        mainCharacterName,
        childGender,
        genre,
        length,
        title,
        story,
      });
      const sid = saved && typeof saved.id === "string" ? saved.id : null;
      if (sid) setLinkedStoryId(sid);
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
    if (!member && !isDefaultStoryText(story)) {
      setBanner({
        source: "tts",
        message: "Log in and join membership to narrate your own stories, or use the sample story text only.",
      });
      return;
    }
    try {
      await makeMp3(story, speed, emotion, language);
    } catch (e: unknown) {
      setBanner({
        source: "tts",
        message: getErrorMessage(e, "Voice failed, try again."),
      });
    }
  }

  async function onPlayLibraryStory(item: StoryLibraryItem) {
    setBanner(null);
    const lang = item.language?.trim() || language;
    try {
      await makeMp3(item.story, speed, emotion, lang);
      onStoryPlayed(item.id, item.title?.trim() || "Story");
      trackEvent("library_play", { storyId: item.id });
    } catch (e: unknown) {
      setBanner({
        source: "tts",
        message: getErrorMessage(e, "Voice failed, try again."),
      });
    }
  }

  async function onCreatePoster() {
    if (!member) return;
    setIsMakingPoster(true);
    setBanner(null);
    try {
      const { outcome, blob } = await createStoryPoster({ title, story, genre });
      trackEvent("poster_created", { layout: outcome });
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
      });
      if (linkedStoryId) {
        try {
          await savePosterForStory(linkedStoryId, blob);
          trackEvent("poster_saved", { storyId: linkedStoryId });
        } catch (e: unknown) {
          console.warn("[poster] file save failed", e);
          setBanner({
            source: "poster",
            message: getErrorMessage(
              e,
              "Poster was created but could not be saved to your library. Save the story first, then create the poster again."
            ),
          });
        }
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
    const g = item.childGender?.toLowerCase();
    setChildGender(g === "girl" || g === "boy" || g === "any" || g === "nonbinary" ? g : "any");
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

  const rootClass = ["pageRoot", "pageRoot--tabs", uiMode === "mobile" && "pageRoot--uiMobile", uiMode === "desktop" && "pageRoot--uiDesktop"]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {showEntry ? <EntryScreen onFinished={() => setShowEntry(false)} /> : null}
      <main className={rootClass}>
        <div className="overlay overlay--withTabs">
          <div className="container">
            <AppChromeBar />
            {/* Hidden audio for TTS autoplay after Make MP3 (no visible playback bar) */}
            <audio ref={audioRef} src={audioUrl || undefined} preload="none" className="visuallyHidden" aria-hidden />
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
                    <button type="button" className="button createStoryHeader__back" onClick={() => setCreatePhase("hub")}>
                      ← Back
                    </button>
                    <div className="title createStoryHeader__title">Story setup</div>
                    <div className="subtitle">Choose genre and length, add optional tone and goals, then generate.</div>
                  </div>
                </>
              ) : null}
              {activeTab === "library" ? (
                <>
                  <div className="title">My Library</div>
                  <div className="subtitle">Browse, open, and play your saved stories.</div>
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
                }}
                onAddKid={() => {
                  setActiveTab("create");
                  setKidModalOpen(true);
                }}
                onAddCharacter={() => {
                  setActiveTab("create");
                  setCharModalOpen(true);
                }}
                member={member}
                onPlaySampleStory={() => {
                  if (auth?.defaultStory) {
                    setTitle(auth.defaultStory.title);
                    setStory(auth.defaultStory.text);
                  }
                  setActiveTab("create");
                  setCreatePhase("story");
                }}
                onGoToMembership={() => setActiveTab("profile")}
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
                creationLocked={!member}
                onGoToMembership={() => setActiveTab("profile")}
              />
            ) : null}

            {activeTab === "create" && createPhase === "story" ? (
              <div className="mainGrid mainGrid--storySetup">
                <div className="leftColumnStory">
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
                    onGenerate={onGenerate}
                    onSave={onSave}
                    onMakeMp3={onMakeMp3}
                    onCreatePoster={onCreatePoster}
                    isMakingPoster={isMakingPoster}
                    isLoadingVoices={isLoadingVoices}
                    voicesError={voicesError}
                    onRetryVoices={() => void fetchVoices()}
                    hasClonedVoice={hasClonedVoice}
                    onRegisterClonedVoice={(voiceId, label, _requiresVerification) =>
                      void registerClonedVoice(voiceId, label)
                    }
                    onClearClonedVoice={() => void clearClonedVoice()}
                    member={member}
                    canPlayNarration={canPlayNarration}
                  />
                </div>

                <div className="rightColumn">
                  <TtsControls speed={speed} emotion={emotion} onSpeedChange={setSpeed} onEmotionChange={setEmotion} />
                  <StoryOutput story={story} isGenerating={isGenerating} />
                </div>
              </div>
            ) : null}

            {activeTab === "library" ? (
              <LibraryPanel
                library={library}
                loadingLibrary={loadingLibrary}
                libraryError={libraryError}
                playBusy={isMakingMp3}
                panelTitle="My Library"
                onRefresh={() => void refreshLibrary()}
                onDismissLibraryError={() => setLibraryError("")}
                onLoadStory={(item) => {
                  onLoadLibraryItem(item);
                  setActiveTab("create");
                  setCreatePhase("story");
                }}
                onPlayStory={(item) => void onPlayLibraryStory(item)}
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
                }}
                authLoading={authLoading}
                loggedIn={Boolean(auth?.loggedIn)}
                member={member}
                email={auth?.email ?? null}
                onLogin={login}
                onLogout={logout}
                onJoinMembership={joinMembership}
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
            onDismiss={dismissPosterPreview}
          />
        ) : null}
      </main>
    </>
  );
}
