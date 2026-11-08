"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "@/app/page.css";
import { BrandMark } from "@/app/components/BrandMark";
import { StoryArtwork } from "@/app/components/StoryArtwork";
import { StoryCover } from "@/app/components/StoryCover";
import { QuietSheet } from "@/app/components/QuietSheet";
import { TtsControls } from "@/app/components/TtsControls";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { friendlyVoiceName } from "@/app/components/voiceLabel";
import { fill } from "@/lib/i18n/locales";
import { useTts } from "@/app/hooks/useTts";
import { useDocumentTheme } from "@/app/hooks/useDocumentTheme";
import { skipWithin } from "@/lib/audio/skipWithin";
import { clearListenPosition, readListenPosition, writeListenPosition } from "@/lib/audio/listenPosition";
import { downloadPosterPng, requestStoryArtwork } from "@/lib/posters/poster";
import type { ArtworkRequestResult } from "@/lib/posters/poster";
import { getErrorMessage } from "@/lib/errors";
import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";
import { PLAYBACK_RATES } from "@/lib/tts/ttsLimits";
import { activeNarrationSpeed, activeTtsConfig } from "@/lib/tts/config";
import { savedAudioIdentityStatus } from "@/lib/tts/audioIdentity";
import { narratorForOpenStory } from "@/lib/voices/narratorChoice";
import { useReadingStats } from "@/app/hooks/useReadingStats";
import dictionaryFile from "@/data/pronunciation/dictionary.json";

type StoryRecord = {
  id: string;
  title: string;
  genre: string;
  length: string;
  text: string;
  age: string | null;
  language: string | null;
  mainCharacterName: string | null;
  posterUrl: string | null;
  coverUrl?: string | null;
  illustrationUrl?: string | null;
  artworkStatus?: string | null;
  posterCaption?: string | null;
  dedication?: string | null;
  audioUrl: string | null;
  audioCacheKey?: string | null;
  audioVoiceId?: string | null;
  audioModelId?: string | null;
  audioConfigVersion?: string | null;
  audioDictionaryVersion?: string | null;
  audioLanguage?: string | null;
  audioVoiceSettings?: { speed?: number } | null;
};

type PosterState = {
  status: "idle" | "generating" | "pending" | "illustrated" | "fallback" | "error";
  illustrationUrl?: string | null;
  coverUrl?: string | null;
  posterUrl?: string | null;
  caption?: string | null;
  dedication?: string | null;
  message?: string;
};

/** Saving the position this often while playing is enough to resume within a couple of seconds. */
const POSITION_SAVE_MS = 2000;

function formatRate(rate: number) {
  return rate === 1 ? "1x" : `${rate}x`;
}

function playbackErrorMessage(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);
  if (/interrupted by a new load request|no supported sources|not supported/i.test(message)) {
    return fallback;
  }
  return message;
}

function storyLanguageName(language: string | null | undefined, labels: { englishName: string; traditionalChinese: string }) {
  const value = (language || "").toLowerCase();
  if (value.includes("hant") || value.includes("tw") || value.includes("hk") || value.startsWith("zh")) return labels.traditionalChinese;
  if (value.startsWith("en")) return labels.englishName;
  return (language || "").trim();
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="listenBar__chevron">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevron({ down }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={down ? "listenScript__chevron listenScript__chevron--down" : "listenScript__chevron"}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="listenTool__icon">
      <path
        d="M4 12h1.2M7.2 8v8M10.2 5.5v13M13.2 8.5v7M16.2 6v12M19.2 9.5v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="listenTool__icon">
      <path
        d="M5 5.5h6.2A2.3 2.3 0 0113.5 7.8V19a2 2 0 00-2-1.6H5V5.5zM19 5.5h-6.2A2.3 2.3 0 0010.5 7.8V19a2 2 0 012-1.6H19V5.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="savePoster__icon">
      <path d="M12 4v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="listenSaved__check">
      <path d="M6 12.5l3.2 3.2L18 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSkip({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="listenSkip__icon">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {back ? (
          <>
            <path d="M1 4v6h6" />
            <path d="M3.5 15a9 9 0 102.1-9.4L1 10" />
          </>
        ) : (
          <>
            <path d="M23 4v6h-6" />
            <path d="M20.5 15a9 9 0 11-2.1-9.4L23 10" />
          </>
        )}
      </g>
    </svg>
  );
}

/**
 * Story player `/story/[id]`.
 * Top to bottom: back and more, the square cover, title with child, narrator, and language, the timeline with
 * real elapsed and total time, −15 / Play / +15, speed and narration, Read story, then the keepsake poster.
 * Play uses this story's saved narration and resumes where this device stopped. It makes narration only when
 * the story has none. Playback speed never calls the voice service.
 */
export function StoryReader({ storyId }: { storyId: string }) {
  const { messages, formatClock: formatLocaleClock } = useInterfaceLocale();
  const copy = messages.reader;
  const posterCopy = messages.poster;
  useDocumentTheme("night");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const posterOnce = useRef<string | null>(null);
  const openedVoiceFor = useRef<string | null>(null);
  const playOnce = useRef(false);
  const lastPositionSave = useRef(0);
  const [from] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("from")));
  const [story, setStory] = useState<StoryRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [poster, setPoster] = useState<PosterState>({ status: "idle" });
  const [coverFailed, setCoverFailed] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATES)[number]>(1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [narrationSpeed, setNarrationSpeed] = useState(() => activeNarrationSpeed());
  const [audioError, setAudioError] = useState("");
  const [audioBroken, setAudioBroken] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [narrationOpen, setNarrationOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [readScale, setReadScale] = useState(0);

  const language = story?.language?.trim() || "zh-Hant";
  const {
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
    isMakingMp3,
    isLoadingVoices,
    voicesError,
    fetchVoices,
    makeMp3,
  } = useTts(language, audioRef);
  const { onStoryPlayed } = useReadingStats();

  const loadStory = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/stories/${encodeURIComponent(storyId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (redirectIfUnsigned(res.status)) {
        throw new Error(data?.error || copy.signIn);
      }
      if (!res.ok) {
        throw new Error(data?.error || `${copy.openFailed} (${res.status})`);
      }
      const row = data?.story as StoryRecord | undefined;
      if (!row?.id) throw new Error(copy.notFound);
      setStory(row);
      setSavedAudioUrl(row.audioUrl);
      const savedStatus =
        row.artworkStatus === "illustrated" || row.artworkStatus === "fallback" || row.artworkStatus === "error"
          ? row.artworkStatus
          : row.posterUrl || row.coverUrl || row.illustrationUrl
            ? "illustrated"
            : null;
      if (savedStatus) {
        setPoster((current) => {
          if (current.status === "generating" || current.status === "pending") return current;
          if (current.illustrationUrl || current.posterUrl || current.coverUrl) return current;
          return {
            status: savedStatus,
            illustrationUrl: row.illustrationUrl,
            coverUrl: row.coverUrl,
            posterUrl: row.posterUrl,
            caption: row.posterCaption,
            dedication: row.dedication,
            message: savedStatus === "illustrated" ? undefined : posterCopy.savedSimple,
          };
        });
      }
      return row;
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error, copy.openFailed));
      return null;
    } finally {
      setLoading(false);
    }
  }, [copy.notFound, copy.openFailed, copy.signIn, posterCopy.savedSimple, storyId]);

  useEffect(() => {
    void loadStory();
    void fetchVoices();
  }, [loadStory, fetchVoices]);

  useEffect(() => {
    if (!story || !voices.length || openedVoiceFor.current === story.id) return;
    openedVoiceFor.current = story.id;
    const next = narratorForOpenStory({
      voices,
      language: story.language?.trim() || "zh-Hant",
      savedVoiceId: story.audioVoiceId,
      queryVoiceId: new URLSearchParams(window.location.search).get("voice"),
    });
    if (next) setSelectedVoiceId(next);
  }, [setSelectedVoiceId, story, voices]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate, savedAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !savedAudioUrl) return;
    const absolute = new URL(savedAudioUrl, window.location.origin).href;
    if (audio.src !== absolute) audio.src = savedAudioUrl;
  }, [savedAudioUrl]);

  const savePosition = useCallback(
    (force: boolean) => {
      const audio = audioRef.current;
      if (!audio || !savedAudioUrl || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const now = Date.now();
      if (!force && now - lastPositionSave.current < POSITION_SAVE_MS) return;
      lastPositionSave.current = now;
      writeListenPosition(storyId, { t: audio.currentTime, d: audio.duration, src: savedAudioUrl });
    },
    [savedAudioUrl, storyId]
  );

  // Leaving the page (back, another tab, closing the app) keeps the place for next time.
  useEffect(() => {
    const onHide = () => savePosition(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      savePosition(true);
    };
  }, [savePosition]);

  const applyArtwork = useCallback((result: ArtworkRequestResult) => {
    const status =
      result.status === "illustrated" || result.status === "fallback" || result.status === "error" || result.status === "pending"
        ? result.status
        : "error";
    setCoverFailed(false);
    setPoster({
      status,
      illustrationUrl: result.illustrationUrl,
      coverUrl: result.coverUrl,
      posterUrl: result.posterUrl,
      caption: result.caption,
      dedication: result.dedication,
      message: result.error,
    });
    setStory((current) =>
      current
        ? {
            ...current,
            illustrationUrl: result.illustrationUrl ?? current.illustrationUrl,
            coverUrl: result.coverUrl ?? current.coverUrl,
            posterUrl: result.posterUrl ?? current.posterUrl,
            posterCaption: result.caption ?? current.posterCaption,
            dedication: result.dedication ?? current.dedication,
            artworkStatus: status === "pending" ? current.artworkStatus : status,
          }
        : current
    );
  }, []);

  const requestArtwork = useCallback(
    async (intent: "create" | "read" | "download" | "reload" | "regenerate", forceFallback = false) => {
      if (!story?.id) return null;
      if (intent === "create" || intent === "regenerate") setPoster({ status: "generating" });
      const result = await requestStoryArtwork({
        storyId: story.id,
        title: story.title,
        intent,
        forceFallback,
      });
      applyArtwork(result);
      return result;
    },
    [applyArtwork, story]
  );

  useEffect(() => {
    if (!story || posterOnce.current === story.id) return;
    if (poster.status === "generating" || poster.status === "illustrated" || poster.status === "fallback" || poster.status === "error") {
      return;
    }
    if (story.artworkStatus === "fallback" || story.artworkStatus === "error" || story.artworkStatus === "illustrated") {
      return;
    }
    if (story.posterUrl || story.coverUrl || story.illustrationUrl) return;
    posterOnce.current = story.id;
    const forceFallback = new URLSearchParams(window.location.search).get("artwork") === "fallback";
    void requestArtwork("create", forceFallback).catch((error: unknown) => {
      setPoster({ status: "error", message: getErrorMessage(error, posterCopy.couldNotCreate) });
    });
  }, [poster.status, posterCopy.couldNotCreate, requestArtwork, story]);

  const audioIdentity = savedAudioIdentityStatus(
    story
      ? {
          audioUrl: savedAudioUrl,
          audioCacheKey: story.audioCacheKey,
          audioVoiceId: story.audioVoiceId,
          audioModelId: story.audioModelId,
          audioConfigVersion: story.audioConfigVersion,
          audioDictionaryVersion: story.audioDictionaryVersion,
          audioLanguage: story.audioLanguage,
          audioSpeed: story.audioVoiceSettings?.speed ?? null,
        }
      : null,
    { voiceId: selectedVoiceId, speed: narrationSpeed, language },
    {
      configVersion: activeTtsConfig().version,
      dictionaryVersion: dictionaryFile.version,
      modelId: activeTtsConfig().modelId,
    }
  );

  function rememberNarration(result: Awaited<ReturnType<typeof makeMp3>>) {
    if (!result.savedAudioUrl) return;
    setAudioBroken(false);
    setSavedAudioUrl(result.savedAudioUrl);
    setStory((current) =>
      current
        ? {
            ...current,
            audioUrl: result.savedAudioUrl,
            audioCacheKey: result.audioCacheKey,
            audioConfigVersion: result.audioConfigVersion,
            audioDictionaryVersion: result.audioDictionaryVersion,
            audioModelId: result.audioModelId,
            audioVoiceId: result.audioVoiceId,
            audioLanguage: language,
            audioVoiceSettings: { speed: result.audioSpeed ?? narrationSpeed },
          }
        : current
    );
  }

  async function ensureAudio() {
    if (!story?.text.trim()) throw new Error(copy.noScript);
    if (savedAudioUrl && (audioIdentity === "fresh" || audioIdentity === "stale" || audioIdentity === "unknown")) {
      return savedAudioUrl;
    }
    setAudioError("");
    const result = await makeMp3(story.text, narrationSpeed, language, story.id, false);
    if (!result.savedAudioUrl) {
      throw new Error(copy.narrationUnsaved);
    }
    rememberNarration(result);
    return result.savedAudioUrl;
  }

  async function onTogglePlay() {
    setAudioError("");
    try {
      const audio = audioRef.current;
      if (playing && audio && savedAudioUrl) {
        audio.pause();
        setPlaying(false);
        return;
      }
      await ensureAudio();
      const next = audioRef.current;
      if (!next) return;
      if (audioBroken) {
        setAudioBroken(false);
        next.load();
      }
      next.playbackRate = playbackRate;
      const started = next.play();
      if (started) {
        started.catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          if (next.paused && /interrupted by a call to pause/i.test(message)) return;
          // iOS drops the tap once narration took a while to make; the audio is ready, so the next tap plays it.
          if (error instanceof DOMException && error.name === "NotAllowedError") {
            setPlaying(false);
            return;
          }
          setAudioError(playbackErrorMessage(error, copy.voiceFailed));
          setPlaying(false);
        });
      }
      if (story) onStoryPlayed(story.id, story.title?.trim() || copy.story);
    } catch (error: unknown) {
      setAudioError(playbackErrorMessage(error, copy.voiceFailed));
      setPlaying(false);
    }
  }

  async function onRegenerate() {
    if (!story?.text.trim()) return;
    setAudioError("");
    setPlaying(false);
    audioRef.current?.pause();
    try {
      const result = await makeMp3(story.text, narrationSpeed, language, story.id, true);
      if (!result.savedAudioUrl) {
        throw new Error(copy.narrationUnsaved);
      }
      clearListenPosition(story.id);
      rememberNarration(result);
      setPlaying(true);
    } catch (error: unknown) {
      setAudioError(playbackErrorMessage(error, copy.voiceFailed));
    }
  }

  useEffect(() => {
    if (!story || playOnce.current || loading) return;
    const wantsPlay = new URLSearchParams(window.location.search).get("play") === "1";
    if (!wantsPlay) return;
    playOnce.current = true;
    void onTogglePlay();
    // Start playback once when Home or the library asked for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, loading]);

  function onSeek(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setProgress(value);
    savePosition(true);
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !savedAudioUrl) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : duration;
    const next = skipWithin(audio.currentTime, seconds, limit);
    audio.currentTime = next;
    setProgress(next);
    savePosition(true);
  }

  async function onDownloadKeepsake() {
    setDownloadError("");
    try {
      const current = poster.posterUrl ? poster : await requestArtwork("download");
      const url = current?.posterUrl;
      if (!url) throw new Error(posterCopy.couldNotDownload);
      const response = await fetch(url);
      if (!response.ok) throw new Error(posterCopy.couldNotDownload);
      downloadPosterPng(await response.blob(), title);
    } catch (error: unknown) {
      setDownloadError(getErrorMessage(error, posterCopy.couldNotDownload));
    }
  }

  function retryCover() {
    void requestArtwork("reload").catch(() => {
      setPoster((state) => ({ ...state, status: "error", message: posterCopy.coverFailed }));
    });
  }

  function newCover() {
    void requestArtwork("regenerate").catch((error: unknown) => {
      setPoster({ status: "error", message: getErrorMessage(error, posterCopy.couldNotCreate) });
    });
  }

  const title = story?.title?.trim() || (loading ? copy.opening : copy.story);
  const childName = story?.mainCharacterName?.trim() || "";
  const narratorVoice = voices.find((voice) => voice.id === selectedVoiceId);
  const recordedVoice = voices.find((voice) => voice.id === story?.audioVoiceId);
  const shownVoice = savedAudioUrl && story?.audioVoiceId ? recordedVoice : narratorVoice;
  const shownName =
    friendlyVoiceName(shownVoice) || (savedAudioUrl && story?.audioVoiceId ? copy.savedNarrator : friendlyVoiceName(narratorVoice));
  const spokenLanguage = storyLanguageName(story?.audioLanguage || language, copy);
  const creditLine = [
    childName ? fill(copy.forChild, { name: childName }) : "",
    shownName && spokenLanguage ? fill(copy.voiceIn, { name: shownName, language: spokenLanguage }) : shownName || spokenLanguage,
  ]
    .filter(Boolean)
    .join(" · ");

  const knownDuration = Number.isFinite(duration) && duration > 0;
  const seekMax = knownDuration ? duration : 0;
  const seekValue = Math.min(progress, seekMax || progress);
  const progressPct = seekMax > 0 ? Math.min(100, (seekValue / seekMax) * 100) : 0;
  const coverUrl = poster.coverUrl ?? story?.coverUrl ?? null;
  const illustrationUrl = poster.illustrationUrl ?? story?.illustrationUrl ?? null;
  const posterUrl = poster.posterUrl ?? story?.posterUrl ?? null;
  const hasSavedArt = Boolean(coverUrl || illustrationUrl || posterUrl);
  const painting = poster.status === "generating" || poster.status === "pending";
  const backHref = from === "home" ? "/?tab=home" : "/?tab=library";
  const backLabel = from === "home" ? messages.nav.home : copy.back;

  let playLabel = copy.play;
  if (isMakingMp3) playLabel = copy.preparing;
  else if (playing) playLabel = copy.pause;
  else if (!savedAudioUrl) playLabel = copy.prepare;

  let statusText = "";
  if (isMakingMp3) statusText = copy.preparing;
  else if (playing) statusText = copy.playing;
  else if (audioIdentity === "stale") statusText = copy.stale;
  else if (!savedAudioUrl) statusText = copy.notReady;
  else if (story && !loadError) statusText = copy.ready;

  return (
    <main className="pageRoot storyPage pageRoot--calm">
      <div className="overlay">
        <div className="container listen">
          <header className="listenBar">
            <Link href={backHref} className="listenBar__back">
              <IconChevronLeft />
              {backLabel}
            </Link>
            <button
              type="button"
              className="listenBar__more"
              aria-label={copy.more}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
              disabled={!story || Boolean(loadError)}
            >
              ···
            </button>
          </header>

          {loadError ? (
            <div className="errorBox" role="alert">
              <span className="errorText">{loadError}</span>
              <div className="errorActions">
                <button className="button buttonPrimary" type="button" onClick={() => void loadStory()}>
                  {copy.tryAgain}
                </button>
              </div>
            </div>
          ) : null}

          <div className="listenCover" data-testid="player-cover" aria-busy={loading || painting}>
            {loading ? (
              <span className="listenCover__skeleton" aria-hidden />
            ) : hasSavedArt && !coverFailed ? (
              <StoryCover
                key={[coverUrl, illustrationUrl, posterUrl].join("|")}
                coverUrl={coverUrl}
                illustrationUrl={illustrationUrl}
                posterUrl={posterUrl}
                priority
                onAllFailed={() => setCoverFailed(true)}
              />
            ) : (
              <div className="listenCover__placeholder" role="img" aria-label={painting ? posterCopy.painting : posterCopy.simpleCover}>
                <BrandMark variant="onDark" className="listenCover__mark" label={null} />
                <span>{painting ? posterCopy.painting : posterCopy.simpleCover}</span>
              </div>
            )}
          </div>
          {!loading && !painting && (coverFailed || (poster.status === "error" && !hasSavedArt)) ? (
            <p className="listenHint listenHint--cover" role="status">
              {coverFailed ? posterCopy.coverFailed : poster.message || posterCopy.couldNotCreate}
              <button type="button" className="listenRetry" onClick={coverFailed ? retryCover : newCover}>
                {coverFailed ? copy.reloadCover : copy.newCover}
              </button>
            </p>
          ) : null}

          <h1 className="listenTitle">{title}</h1>
          {creditLine ? <p className="listenMeta">{creditLine}</p> : null}
          {story && !loadError ? (
            <p className="listenSaved">
              <IconCheck />
              {copy.savedTo}
            </p>
          ) : null}

          <p className={`listenStatus${audioError ? " listenStatus--error" : ""}`} role="status">
            {audioError ? (
              <>
                {audioError}
                <button type="button" className="listenRetry" onClick={() => void onTogglePlay()}>
                  {copy.tryAgain}
                </button>
              </>
            ) : (
              statusText
            )}
          </p>

          <div className="listenTimeline">
            <input
              className="listenSeek"
              type="range"
              min={0}
              max={seekMax || 0}
              step={0.1}
              value={seekMax ? seekValue : 0}
              style={{ ["--pct" as string]: `${progressPct}%` }}
              onChange={(event) => onSeek(Number(event.target.value))}
              disabled={!savedAudioUrl || isMakingMp3 || !knownDuration}
              aria-label={copy.timeline}
              aria-valuemin={0}
              aria-valuemax={Math.round(seekMax || 0)}
              aria-valuenow={Math.round(seekValue || 0)}
              aria-valuetext={
                savedAudioUrl
                  ? fill(copy.progress, {
                      current: formatLocaleClock(seekValue),
                      total: knownDuration ? formatLocaleClock(duration) : copy.unknownLength,
                    })
                  : copy.noAudio
              }
            />
            <div className="listenTimes">
              <span>{formatLocaleClock(savedAudioUrl ? seekValue : 0)}</span>
              <span>{knownDuration ? formatLocaleClock(duration) : "–:––"}</span>
            </div>
          </div>

          <div className="listenTransport">
            <button
              type="button"
              className="listenSkip"
              aria-label={copy.back15}
              onClick={() => skip(-15)}
              disabled={!savedAudioUrl || isMakingMp3 || !knownDuration}
            >
              <IconSkip back />
              <span className="listenSkip__label" aria-hidden>
                15
              </span>
            </button>
            <button
              type="button"
              className={`listenPlay${!savedAudioUrl && !playing ? " listenPlay--prepare" : ""}`}
              onClick={() => void onTogglePlay()}
              disabled={!story || isMakingMp3 || Boolean(loadError)}
              aria-label={playLabel}
              aria-busy={isMakingMp3}
            >
              {isMakingMp3 ? (
                <span className="listenSpinner" />
              ) : playing ? (
                <span className="listenPause" aria-hidden />
              ) : savedAudioUrl ? (
                <span className="listenTriangle" aria-hidden />
              ) : (
                <span className="listenPrepare">{copy.prepare}</span>
              )}
            </button>
            <button
              type="button"
              className="listenSkip"
              aria-label={copy.forward15}
              onClick={() => skip(15)}
              disabled={!savedAudioUrl || isMakingMp3 || !knownDuration}
            >
              <IconSkip />
              <span className="listenSkip__label" aria-hidden>
                15
              </span>
            </button>
          </div>

          <div className="listenTools">
            <div className="listenSpeed">
              <button
                type="button"
                className="listenSpeed__button"
                aria-haspopup="listbox"
                aria-expanded={speedOpen}
                aria-label={fill(copy.speedValue, { rate: formatRate(playbackRate) })}
                onClick={() => setSpeedOpen((open) => !open)}
              >
                {formatRate(playbackRate)}
                <span className="listenSpeed__caret" aria-hidden>
                  ▾
                </span>
              </button>
              {speedOpen ? (
                <ul className="listenSpeed__menu" role="listbox" aria-label={copy.speed}>
                  {PLAYBACK_RATES.map((rate) => (
                    <li key={rate}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={playbackRate === rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          setSpeedOpen(false);
                        }}
                      >
                        {formatRate(rate)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button type="button" className="listenNarration" onClick={() => setNarrationOpen(true)}>
              <IconWave />
              {copy.narration}
            </button>
          </div>

          <section className="listenScriptCard" aria-label={copy.readStory}>
            <button
              type="button"
              className="listenScript"
              aria-expanded={scriptOpen}
              onClick={() => setScriptOpen((open) => !open)}
            >
              <IconBook />
              <span>{copy.readStory}</span>
              <IconChevron down={!scriptOpen} />
            </button>
            {scriptOpen ? (
              <div
                className="listenScript__body"
                style={{ ["--read-size" as string]: ["1.125rem", "1.25rem", "1.45rem"][readScale] }}
              >
                <div className="listenReadTools">
                  <span>{copy.textSize}</span>
                  <button type="button" onClick={() => setReadScale((size) => Math.max(0, size - 1))} disabled={readScale === 0} aria-label={copy.smaller}>
                    A−
                  </button>
                  <button type="button" onClick={() => setReadScale((size) => Math.min(2, size + 1))} disabled={readScale === 2} aria-label={copy.larger}>
                    A+
                  </button>
                </div>
                {loading ? <p className="listenHint">{copy.loadingScript}</p> : null}
                {story?.text ? <p className="listenScript__text">{story.text}</p> : null}
                {!loading && !story?.text ? <p className="listenHint">{copy.noScript}</p> : null}
              </div>
            ) : null}
          </section>

          {story && !loadError ? (
            <section className="listenKeepsake" aria-labelledby="keepsake-heading">
              <h2 id="keepsake-heading" className="listenKeepsake__title">
                {copy.keepsakeTitle}
              </h2>
              <p className="listenKeepsake__body">{copy.keepsakeBody}</p>
              {posterUrl ? (
                <figure className="listenKeepsake__frame">
                  {/* The saved 4:5 keepsake, shown whole at its own proportions: the same file Save my poster downloads. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterUrl}
                    alt={fill(copy.keepsakeAlt, { title })}
                    className="listenKeepsake__img"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              ) : (
                <StoryArtwork
                  kind="keepsake"
                  title={title}
                  caption={poster.caption || story.posterCaption}
                  dedication={poster.dedication || story.dedication}
                  illustrationUrl={poster.status === "fallback" || poster.status === "error" ? null : illustrationUrl}
                  status={poster.status}
                  message={poster.message}
                  large={readScale > 0}
                />
              )}
              <button
                type="button"
                className="savePoster"
                data-testid="save-poster"
                onClick={() => void onDownloadKeepsake()}
                disabled={painting}
              >
                <IconDownload />
                {posterCopy.save}
              </button>
              {downloadError ? (
                <p className="listenStatus listenStatus--error" role="alert">
                  {downloadError}
                </p>
              ) : null}
            </section>
          ) : null}

          <audio
            ref={audioRef}
            preload="metadata"
            playsInline
            className="listenAudio"
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false);
              savePosition(true);
            }}
            onEnded={() => {
              setPlaying(false);
              clearListenPosition(storyId);
            }}
            onError={() => {
              if (!savedAudioUrl) return;
              setPlaying(false);
              setAudioBroken(true);
              setAudioError(copy.audioLoadFailed);
            }}
            onTimeUpdate={(event) => {
              setProgress(event.currentTarget.currentTime);
              savePosition(false);
            }}
            onLoadedMetadata={(event) => {
              const audio = event.currentTarget;
              const nextDuration = audio.duration || 0;
              setDuration(nextDuration);
              setAudioBroken(false);
              const saved = readListenPosition(storyId, savedAudioUrl);
              if (saved && nextDuration > saved.t + 1) {
                audio.currentTime = saved.t;
                setProgress(saved.t);
              }
            }}
            onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
          />
        </div>
      </div>

      {moreOpen ? (
        <QuietSheet title={copy.actions} closeLabel={messages.common.close} onClose={() => setMoreOpen(false)}>
          <button
            type="button"
            className="sheetAction"
            onClick={newCover}
            disabled={!story || poster.status === "generating"}
          >
            {poster.status === "generating" ? posterCopy.painting : copy.newCover}
          </button>
          <button
            type="button"
            className="sheetAction"
            onClick={() => void onDownloadKeepsake()}
            disabled={!story || poster.status === "generating"}
          >
            {posterCopy.save}
          </button>
          {coverFailed ? (
            <button type="button" className="sheetAction" onClick={retryCover}>
              {copy.reloadCover}
            </button>
          ) : null}
          <p className="listenHint">{copy.actionsHint}</p>
        </QuietSheet>
      ) : null}

      {narrationOpen ? (
        <QuietSheet title={copy.narration} closeLabel={messages.common.close} onClose={() => setNarrationOpen(false)}>
          <label className="createSheet__field">
            <span className="createScreen__label">{copy.voice}</span>
            <select
              value={selectedVoiceId}
              onChange={(event) => setSelectedVoiceId(event.target.value)}
              disabled={isLoadingVoices || isMakingMp3}
            >
              {isLoadingVoices ? <option value="">{copy.loadingVoices}</option> : null}
              {voicesError ? <option value="">{copy.voicesUnavailable}</option> : null}
              {!isLoadingVoices && !voicesError
                ? voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {friendlyVoiceName(voice) || voice.id}
                      {voice.language ? ` · ${storyLanguageName(voice.language, copy)}` : ""}
                    </option>
                  ))
                : null}
            </select>
            {voicesError ? (
              <button className="listenRetry" type="button" onClick={() => void fetchVoices()}>
                {copy.retryVoices}
              </button>
            ) : null}
          </label>
          <TtsControls speed={narrationSpeed} onSpeedChange={setNarrationSpeed} />
          <button
            type="button"
            className="sheetAction sheetAction--last"
            onClick={() => void onRegenerate()}
            disabled={!story || isMakingMp3}
          >
            {isMakingMp3 ? copy.regenerating : copy.regenerate}
          </button>
          <p className="listenHint">
            {copy.regenerateHint}
          </p>
        </QuietSheet>
      ) : null}
    </main>
  );
}
