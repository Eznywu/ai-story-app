"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { AppBannerError, AppBannerSource, StoryGenerationInput } from "@/lib/types";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import type { StoryLibraryItem } from "@/app/hooks/useStoryLibrary";
import type { KidProfile, StoryCharacterProfile } from "@/lib/profiles/profilesTypes";
import {
  loadOnboardingState,
  saveOnboardingState,
  type OnboardingIntent,
} from "@/lib/profiles/localProfilesStorage";
import { useAuthUser } from "@/app/components/RequireAuth";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { useDocumentTheme } from "@/app/hooks/useDocumentTheme";
import { storyLanguageFromInterface } from "@/lib/i18n/locales";
import { selectionAfterLanguageChange } from "@/lib/voices/decisions";
import { formatSwitchNotice } from "@/lib/voices/uiCopy";

export type HomeUiMode = "responsive" | "mobile" | "desktop";

function warmBanner(source: AppBannerSource, banner: { story: string; save: string; tts: string; poster: string }): string {
  switch (source) {
    case "story":
      return banner.story;
    case "save":
      return banner.save;
    case "tts":
      return banner.tts;
    case "poster":
      return banner.poster;
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

const CREATE_DRAFT_KEY = "happy-horse.createDraft.v1";

type CreateDraft = {
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
  selectedVoiceId: string;
};

function loadCreateDraft(): CreateDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CREATE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreateDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      age: String(parsed.age || ""),
      language: String(parsed.language || ""),
      mainCharacterName: String(parsed.mainCharacterName || ""),
      childGender: String(parsed.childGender || ""),
      genre: String(parsed.genre || ""),
      length: String(parsed.length || ""),
      storyInput: String(parsed.storyInput || ""),
      theme: String(parsed.theme || ""),
      mood: String(parsed.mood || ""),
      seriesMode: parsed.seriesMode === "series" ? "series" : "one_shot",
      educationalGoal: String(parsed.educationalGoal || ""),
      moralLesson: String(parsed.moralLesson || ""),
      selectedVoiceId: String(parsed.selectedVoiceId || ""),
    };
  } catch {
    return null;
  }
}

function saveCreateDraft(draft: CreateDraft) {
  try {
    localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

export function HomeApp({ uiMode = "responsive" }: Props) {
  const router = useRouter();
  const { user, authEnabled } = useAuthUser();
  const { locale, messages } = useInterfaceLocale();
  const localeRef = useRef(locale);
  localeRef.current = locale;
  // Form defaults, not a saved child. With login paused, Profile can be empty
  // while this name and age still appear. They are not an account identity.
  const [age, setAge] = useState("6 months");
  const [language, setLanguage] = useState("zh-Hant");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [switchPair, setSwitchPair] = useState<{ from: string; to: string } | null>(null);
  const [mainCharacterName, setMainCharacterName] = useState("嚕嚕");
  const [characterPick, setCharacterPick] = useState<NonNullable<StoryGenerationInput["character"]> | null>(null);
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
  const [gateReady, setGateReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<"setup" | "returning">("setup");
  const [activeTab, setActiveTab] = useState<HomeTabId>("home");
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [charModalOpen, setCharModalOpen] = useState(false);

  const { isGenerating, generateStory } = useStoryGeneration();
  const generateLock = useRef(false);
  const unsavedStory = useRef<{ text: string; visualBrief: unknown } | null>(null);
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
    personalVoices,
    voiceLimit,
    chooseVoice,
    registerClonedVoice,
  } = useTts(language);

  const { profiles: kids, add: addKid } = useKidProfiles();
  const { characters, add: addCharacter } = useStoryCharacters();
  const { stats, setDraftSummary } = useReadingStats();
  useDocumentTheme(!gateReady || showWelcome || showOnboarding ? "night" : "warm");

  const canContinueReading = useMemo(
    () => Boolean(stats?.lastStoryId && library.some((i) => i.id === stats.lastStoryId)),
    [stats?.lastStoryId, library]
  );

  useEffect(() => {
    void refreshLibrary();
    const tab = new URLSearchParams(window.location.search).get("tab");
    const explicitTab =
      tab === "home" || tab === "create" || tab === "library" || tab === "profile" ? tab : null;
    if (explicitTab) setActiveTab(explicitTab);
    const onboarding = loadOnboardingState(user.id);
    setShowWelcome(!onboarding.completed);
    setShowOnboarding(false);
    setGateReady(true);
    const draft = loadCreateDraft();
    if (draft?.language) setLanguage(draft.language);
    else {
      const mapped = storyLanguageFromInterface(localeRef.current);
      if (mapped) setLanguage(mapped);
    }
    if (draft) {
      if (draft.age) setAge(draft.age);
      if (draft.mainCharacterName) setMainCharacterName(draft.mainCharacterName);
      if (draft.childGender) setChildGender(draft.childGender);
      if (draft.genre) setGenre(draft.genre);
      if (draft.length) setLength(draft.length);
      if (typeof draft.storyInput === "string") setStoryInput(draft.storyInput);
      if (typeof draft.theme === "string") setTheme(draft.theme);
      if (typeof draft.mood === "string") setMood(draft.mood);
      if (draft.seriesMode === "series" || draft.seriesMode === "one_shot") setSeriesMode(draft.seriesMode);
      if (typeof draft.educationalGoal === "string") setEducationalGoal(draft.educationalGoal);
      if (typeof draft.moralLesson === "string") setMoralLesson(draft.moralLesson);
      if (draft.selectedVoiceId) setSelectedVoiceId(draft.selectedVoiceId);
    }
    // A saved onboarding intent (for example "create a story") must not override
    // an explicit ?tab= link such as the story page's back-to-library control.
    if (!explicitTab && onboarding.completed) applyOnboardingIntent(onboarding.selectedIntent ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (!gateReady) return;
    const line = mainCharacterName.trim() ? `${mainCharacterName.trim()} · ${genre}` : null;
    // Typing a name should save once, not on every keystroke.
    const timer = window.setTimeout(() => setDraftSummary(line), 800);
    return () => window.clearTimeout(timer);
  }, [gateReady, mainCharacterName, genre, setDraftSummary]);

  useEffect(() => {
    if (!gateReady) return;
    saveCreateDraft({
      age,
      language,
      mainCharacterName,
      childGender,
      genre,
      length,
      storyInput,
      theme,
      mood,
      seriesMode,
      educationalGoal,
      moralLesson,
      selectedVoiceId,
    });
  }, [
    age,
    childGender,
    educationalGoal,
    gateReady,
    genre,
    language,
    length,
    mainCharacterName,
    mood,
    moralLesson,
    selectedVoiceId,
    seriesMode,
    storyInput,
    theme,
  ]);

  useEffect(() => {
    if (!gateReady || showWelcome || showOnboarding) return;
    const key = `happy-horse.scroll.${activeTab}`;
    const scroller = document.querySelector(".overlay--withTabs");
    const deviceScrolls =
      scroller instanceof HTMLElement && scroller.scrollHeight > scroller.clientHeight + 8;
    const saved = Number(sessionStorage.getItem(key) || "0");
    if (Number.isFinite(saved) && saved > 0) {
      requestAnimationFrame(() => {
        if (deviceScrolls && scroller instanceof HTMLElement) scroller.scrollTop = saved;
        else window.scrollTo(0, saved);
      });
    }
    function persist() {
      const top = deviceScrolls && scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;
      sessionStorage.setItem(key, String(top));
    }
    window.addEventListener("scroll", persist, { passive: true });
    scroller?.addEventListener("scroll", persist, { passive: true });
    return () => {
      persist();
      window.removeEventListener("scroll", persist);
      scroller?.removeEventListener("scroll", persist);
    };
  }, [activeTab, gateReady, showOnboarding, showWelcome]);

  function openStory(id: string, play = false) {
    const query = new URLSearchParams();
    if (play) query.set("play", "1");
    if (activeTab === "home") query.set("from", "home");
    const suffix = query.toString();
    router.push(`/story/${id}${suffix ? `?${suffix}` : ""}`);
  }

  useEffect(() => {
    void fetchVoices();
  }, [fetchVoices]);

  function onVoicePick(voiceId: string) {
    chooseVoice(voiceId);
    setSwitchPair(null);
    setVoiceNotice("");
    setPersonalNote("");
  }

  function onLanguagePick(next: string) {
    setLanguage(next);
    const current = voices.find((voice) => voice.id === selectedVoiceId);
    const nextPick = selectionAfterLanguageChange({
      previousId: selectedVoiceId,
      previousKind: current?.kind === "personal" ? "personal" : current ? "default" : "unknown",
      language: next,
      voices: voices.map((voice) => ({
        id: voice.id,
        name: voice.name || voice.id,
        description: voice.description || "",
        language: voice.recordingLocale || voice.language || "en",
        languages: (voice.languages?.length ? voice.languages : [voice.recordingLocale || voice.language || "en"]).slice(),
        group: voice.group === "mine" ? "mine" : "story",
        kind: voice.kind === "personal" ? "personal" : "default",
        status:
          voice.status === "pending_verification" || voice.status === "deleting" || voice.status === "delete_failed"
            ? voice.status
            : voice.status === "pending_audition"
              ? "pending_audition"
              : "ready",
        selectable: voice.selectable !== false,
        isDefault: voice.isDefault,
        nonNativeRisk: voice.nonNativeRisk,
      })),
    });
    chooseVoice(nextPick.voiceId);
    setPersonalNote(nextPick.personalNote);
    setSwitchPair(nextPick.replaced ? { from: selectedVoiceId, to: nextPick.voiceId } : null);
    setVoiceNotice("");
  }

  useEffect(() => {
    if (!switchPair) return;
    const from = voices.find((voice) => voice.id === switchPair.from);
    const to = voices.find((voice) => voice.id === switchPair.to);
    if (!from?.name || !to?.name) return;
    setVoiceNotice(formatSwitchNotice(from.name, to.name, language));
  }, [language, switchPair, voices]);

  const applyKidProfile = useCallback((k: KidProfile) => {
    setAge(k.age);
    setMainCharacterName(k.name);
    setCharacterPick({
      id: k.id,
      name: k.name,
      type: "human child",
      characterAge: k.age,
    });
    setChildGender(k.gender === "boy" ? "boy" : k.gender === "girl" ? "girl" : "nonbinary");
    const base = k.interests.length ? `Interests: ${k.interests.join(", ")}` : "";
    setStoryInput(base.slice(0, STORY_INPUT_MAX_CHARS));
    setActiveTab("create");
  }, []);

  const applyCharacterProfile = useCallback((c: StoryCharacterProfile) => {
    setMainCharacterName(c.name);
    setCharacterPick({
      id: c.id,
      name: c.name,
      type: c.characterType || "story character",
      characterAge: c.ageRange || null,
      visualStyle: c.visualStyle,
    });
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

  function snapshotForSave() {
    return {
      id: characterPick?.id ?? null,
      version: characterPick?.version ?? null,
      name: mainCharacterName.trim() || characterPick?.name || "the listener",
      type: characterPick?.type || (childGender === "any" ? "story character" : "human child"),
      characterAge: characterPick?.characterAge ?? null,
      visualStyle: characterPick?.visualStyle ?? null,
      appearance: characterPick?.appearance ?? null,
      referenceImageUrl: characterPick?.referenceImageUrl ?? null,
    };
  }

  async function persistStory(text: string, visualBrief: unknown) {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Generate a story first.");
    const snapshot = snapshotForSave();
    const saved = await saveStory({
      age,
      language,
      mainCharacterName,
      childGender,
      genre,
      length,
      title: `${mainCharacterName.trim() || "A new"} story`,
      story: trimmed,
      characterId: snapshot.id,
      characterSnapshot: snapshot,
      visualBrief,
    });
    return saved && typeof saved.id === "string" ? saved.id : null;
  }

  /** Saves a story that was already written. A failed save keeps it here so retrying does not pay for a new story. */
  async function saveGenerated(generated: { text: string; visualBrief: unknown }) {
    try {
      const sid = await persistStory(generated.text, generated.visualBrief);
      if (!sid) throw new Error("The story was written but could not be saved. Tap Try again.");
      unsavedStory.current = null;
      const voiceQuery = selectedVoiceId ? `?voice=${encodeURIComponent(selectedVoiceId)}` : "";
      router.push(`/story/${sid}${voiceQuery}`);
    } catch (e: unknown) {
      unsavedStory.current = generated;
      setBanner({
        source: "save",
        message: getErrorMessage(e, "The story was written but could not be saved. Tap Try again."),
      });
    }
  }

  async function onRetrySave() {
    const pending = unsavedStory.current;
    if (!pending || generateLock.current || isSaving) return;
    generateLock.current = true;
    try {
      await saveGenerated(pending);
    } finally {
      generateLock.current = false;
    }
  }

  async function onGenerate() {
    if (generateLock.current || isGenerating || isSaving) return;
    generateLock.current = true;
    setBanner(null);
    unsavedStory.current = null;
    const guidance = buildGuidance(storyInput, theme, mood, seriesMode, educationalGoal, moralLesson);
    try {
      const generated = await generateStory({
        age,
        language,
        mainCharacterName,
        childGender,
        genre,
        length,
        title: `${mainCharacterName.trim() || "A new"} story`,
        storyInput: guidance,
        character: snapshotForSave(),
      });
      const text = generated.text;
      if (!text.trim()) {
        setBanner({ source: "story", message: "The story came back empty. Try again." });
        return;
      }
      trackEvent("story_generated", { genre, length, language });
      await saveGenerated(generated);
    } catch (e: unknown) {
      setBanner({
        source: "story",
        message: getErrorMessage(e, "Failed to generate story."),
      });
    } finally {
      generateLock.current = false;
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
    if (banner.source === "save" && unsavedStory.current) void onRetrySave();
    else if (banner.source === "story" || banner.source === "save") void onGenerate();
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

  if (!gateReady) {
    return <main className="pageRoot" aria-busy="true" />;
  }

  const rootClass = [
    "pageRoot",
    "pageRoot--tabs",
    "pageRoot--warm",
    activeTab === "create" && "pageRoot--calm",
    uiMode === "mobile" && "pageRoot--uiMobile",
    uiMode === "desktop" && "pageRoot--uiDesktop",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {showWelcome ? (
        <EntryScreen
          onFirstStory={() => {
            setShowWelcome(false);
            setOnboardingMode("setup");
            setShowOnboarding(true);
          }}
          onReturning={() => {
            setShowWelcome(false);
            setOnboardingMode("returning");
            setShowOnboarding(true);
          }}
        />
      ) : null}
      {!showWelcome && showOnboarding ? (
        <OnboardingFlow
          mode={onboardingMode}
          onCreateKid={({ name, age: kidAge, interests }) => {
            const created = addKid({
              name,
              age: kidAge,
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
            <AppChromeBar tone="light" />
            {activeTab === "library" ? (
              <header>
                <div className="title">{messages.library.title}</div>
                <div className="subtitle">{messages.library.subtitle}</div>
              </header>
            ) : null}

            {banner ? (
              <div className="errorBox" role="alert">
                <p className="errorText">{warmBanner(banner.source, messages.banner)}</p>
                <div className="errorActions">
                  <button
                    className="button errorRetry"
                    type="button"
                    onClick={retryBanner}
                    disabled={bannerRetryBusy}
                  >
                    {messages.common.tryAgain}
                  </button>
                  <button
                    className="button errorDismiss"
                    type="button"
                    onClick={() => setBanner(null)}
                    disabled={bannerRetryBusy}
                  >
                    {messages.common.dismiss}
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === "home" ? (
              <HomeScreenPanel
                library={library}
                loadingLibrary={loadingLibrary}
                stats={stats}
                voices={voices}
                onOpenStory={(item) => openLibraryStory(item)}
                onPlayStory={(item) => openLibraryStory(item, true)}
                onSeeAll={() => setActiveTab("library")}
                onQuickCreate={() => setActiveTab("create")}
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
                personalVoices={personalVoices}
                voiceLimit={voiceLimit}
                voiceNotice={voiceNotice}
                personalNote={personalNote}
                isLoadingVoices={isLoadingVoices}
                voicesError={voicesError}
                isGenerating={isGenerating || isSaving}
                submitLabel={
                  isSaving ? messages.voice.saving : isGenerating ? messages.voice.writing : messages.voice.createStory
                }
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
                onVoiceChange={onVoicePick}
                onVoiceCreated={(voiceId, selectable) => {
                  if (selectable) void registerClonedVoice(voiceId);
                  else void fetchVoices();
                }}
                onRetryVoices={() => void fetchVoices()}
                onAddKid={() => setKidModalOpen(true)}
                onAddCharacter={() => setCharModalOpen(true)}
                onSelectKid={applyKidProfile}
                onSelectCharacter={applyCharacterProfile}
                onCreate={() => void onGenerate()}
              />
            ) : null}

            {activeTab === "library" ? (
              <LibraryPanel
                library={library}
                loadingLibrary={loadingLibrary}
                libraryError={libraryError}
                playBusy={false}
                panelTitle={messages.library.title}
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
                email={authEnabled ? user.email : undefined}
                language={language}
                stats={stats}
                kids={kids}
                characters={characters}
                onAddKid={() => setKidModalOpen(true)}
                onAddCharacter={() => setCharModalOpen(true)}
                onCreateStory={() => setActiveTab("create")}
              />
            ) : null}

            {gateReady && !showWelcome ? (
              <footer className="legalFooter">
                <a href="/legal/privacy">{messages.common.privacy}</a>
                <span aria-hidden="true"> · </span>
                <a href="/legal/terms">{messages.common.terms}</a>
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
