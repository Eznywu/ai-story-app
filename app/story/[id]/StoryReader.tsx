"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "@/app/page.css";
import { QuietSheet } from "@/app/components/QuietSheet";
import { TtsControls } from "@/app/components/TtsControls";
import { friendlyVoiceName, languageLabel } from "@/app/components/voiceLabel";
import { useTts } from "@/app/hooks/useTts";
import { useStoryLibrary } from "@/app/hooks/useStoryLibrary";
import { createStoryPoster, downloadPosterPng } from "@/lib/posters/poster";
import type { PosterCreateOutcome } from "@/lib/posters/poster";
import { getErrorMessage } from "@/lib/errors";
import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";
import { TTS_SPEED_DEFAULT } from "@/lib/tts/ttsLimits";
import { useReadingStats } from "@/app/hooks/useReadingStats";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

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
  audioUrl: string | null;
};

type PosterState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "ready"; url: string; outcome: PosterCreateOutcome; hint?: string }
  | { status: "error"; message: string };

function formatRate(rate: number) {
  return rate === 1 ? "1x" : `${rate}x`;
}

function playbackErrorMessage(error: unknown) {
  const message = getErrorMessage(error, "Voice failed, try again.");
  if (/interrupted by a new load request|no supported sources|not supported/i.test(message)) {
    return "Voice failed, try again.";
  }
  return message;
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${remain.toString().padStart(2, "0")}`;
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

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="listenSaved__check">
      <path d="M6 12.5l3.2 3.2L18 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Story page `/story/[id]`.
 * Cover, title, timeline, and Play. Speed is one control. Read story expands in place.
 * Cover, keepsake, and narration changes live in labelled sheets.
 * Play creates narration only when this story has none yet. Playback speed does not call the voice provider again.
 */
export function StoryReader({ storyId }: { storyId: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const posterOnce = useRef<string | null>(null);
  const playOnce = useRef(false);
  const [story, setStory] = useState<StoryRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [poster, setPoster] = useState<PosterState>({ status: "idle" });
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATES)[number]>(1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [narrationSpeed, setNarrationSpeed] = useState(TTS_SPEED_DEFAULT);
  const [emotion, setEmotion] = useState(40);
  const [audioError, setAudioError] = useState("");
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [narrationOpen, setNarrationOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);

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
  const { savePosterForStory } = useStoryLibrary();
  const { onStoryPlayed } = useReadingStats();

  const loadStory = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/stories/${encodeURIComponent(storyId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (redirectIfUnsigned(res.status)) {
        throw new Error(data?.error || "Sign in to continue.");
      }
      if (!res.ok) {
        throw new Error(data?.error || `Could not open this story (${res.status})`);
      }
      const row = data?.story as StoryRecord | undefined;
      if (!row?.id) throw new Error("Story not found.");
      setStory(row);
      setSavedAudioUrl(row.audioUrl);
      if (row.posterUrl) {
        setPoster({ status: "ready", url: row.posterUrl, outcome: "illustrated" });
      }
      return row;
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error, "Could not open this story."));
      return null;
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    void loadStory();
    void fetchVoices();
  }, [loadStory, fetchVoices]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("voice");
    if (!requested || !voices.some((voice) => voice.id === requested)) return;
    setSelectedVoiceId(requested);
  }, [setSelectedVoiceId, voices]);

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

  const generatePoster = useCallback(async () => {
    if (!story?.text.trim()) return;
    setPoster({ status: "generating" });
    try {
      const result = await createStoryPoster({
        title: story.title,
        story: story.text,
        genre: story.genre,
        storyId: story.id,
      });
      const saved = await savePosterForStory(story.id, result.blob);
      const url = saved.posterUrl || URL.createObjectURL(result.blob);
      setPoster({
        status: "ready",
        url,
        outcome: result.outcome,
        hint: result.fallbackReason,
      });
      setStory((current) => (current ? { ...current, posterUrl: saved.posterUrl || url } : current));
    } catch (error: unknown) {
      setPoster({
        status: "error",
        message: getErrorMessage(error, "Poster could not be created."),
      });
    }
  }, [savePosterForStory, story]);

  useEffect(() => {
    if (!story || story.posterUrl || posterOnce.current === story.id) return;
    if (poster.status === "generating" || poster.status === "ready" || poster.status === "error") return;
    posterOnce.current = story.id;
    void generatePoster();
  }, [generatePoster, poster.status, story]);

  async function ensureAudio() {
    if (!story?.text.trim()) throw new Error("This story has no script yet.");
    if (savedAudioUrl) return savedAudioUrl;
    setAudioError("");
    const result = await makeMp3(story.text, narrationSpeed, emotion, language, story.id);
    if (!result.savedAudioUrl) {
      throw new Error("Narration played, but it could not be saved on this story.");
    }
    setSavedAudioUrl(result.savedAudioUrl);
    setStory((current) => (current ? { ...current, audioUrl: result.savedAudioUrl } : current));
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
      next.playbackRate = playbackRate;
      const started = next.play();
      if (started) {
        started.catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          if (next.paused && /interrupted by a call to pause/i.test(message)) return;
          setAudioError(playbackErrorMessage(error));
          setPlaying(false);
        });
      }
      if (story) onStoryPlayed(story.id, story.title?.trim() || "Story");
    } catch (error: unknown) {
      setAudioError(playbackErrorMessage(error));
      setPlaying(false);
    }
  }

  async function onRegenerate() {
    if (!story?.text.trim()) return;
    setAudioError("");
    setPlaying(false);
    audioRef.current?.pause();
    try {
      const result = await makeMp3(story.text, narrationSpeed, emotion, language, story.id);
      if (!result.savedAudioUrl) {
        throw new Error("Narration played, but it could not be saved on this story.");
      }
      setSavedAudioUrl(result.savedAudioUrl);
      setStory((current) => (current ? { ...current, audioUrl: result.savedAudioUrl } : current));
      setPlaying(true);
    } catch (error: unknown) {
      setAudioError(playbackErrorMessage(error));
    }
  }

  useEffect(() => {
    if (!story || playOnce.current || loading) return;
    const wantsPlay = new URLSearchParams(window.location.search).get("play") === "1";
    if (!wantsPlay) return;
    playOnce.current = true;
    void onTogglePlay();
    // Start playback once when the library asked for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, loading]);

  function onSeek(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setProgress(value);
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !savedAudioUrl) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : duration;
    const next = Math.min(Math.max(0, audio.currentTime + seconds), limit || 0);
    audio.currentTime = next;
    setProgress(next);
  }

  async function onDownloadKeepsake() {
    if (poster.status !== "ready") {
      await generatePoster();
      return;
    }
    const response = await fetch(poster.url);
    if (!response.ok) throw new Error("Could not download this poster.");
    const blob = await response.blob();
    downloadPosterPng(blob, title);
  }

  const title = story?.title?.trim() || (loading ? "Opening story…" : "Bedtime story");
  const childName = story?.mainCharacterName?.trim() || "";
  const narratorVoice = voices.find((voice) => voice.id === selectedVoiceId);
  const narratorName = friendlyVoiceName(narratorVoice);
  const spokenLanguage = languageLabel(language);
  const creditLine = [
    childName ? `For ${childName}` : "",
    narratorName && spokenLanguage ? `${narratorName} in ${spokenLanguage}` : narratorName || spokenLanguage,
  ]
    .filter(Boolean)
    .join(" · ");

  const knownDuration = Number.isFinite(duration) && duration > 0;
  const seekMax = knownDuration ? duration : 0;
  const seekValue = Math.min(progress, seekMax || progress);
  const progressPct = seekMax > 0 ? Math.min(100, (seekValue / seekMax) * 100) : 0;
  const coverFailed = poster.status === "error" || (poster.status === "ready" && poster.outcome === "text_fallback");
  const showArtwork = poster.status === "ready";

  let playLabel = "Play";
  if (isMakingMp3) playLabel = "Preparing narration";
  else if (playing) playLabel = "Pause";
  else if (!savedAudioUrl) playLabel = "Play";

  let statusText = "";
  if (isMakingMp3) statusText = "Preparing narration";
  else if (playing) statusText = "Playing";
  else if (story && !loadError) statusText = "Ready to play";

  return (
    <main className="pageRoot storyPage pageRoot--calm">
      <div className="overlay">
        <div className="container listen">
          <header className="listenBar">
            <Link href="/?tab=library" className="listenBar__back">
              <IconChevronLeft />
              My Stories
            </Link>
            <button
              type="button"
              className="listenBar__more"
              aria-label="More actions"
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
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          <div className={`listenCover${coverFailed ? " listenCover--fallback" : ""}`}>
            {showArtwork ? (
              <Image
                src={poster.status === "ready" ? poster.url : ""}
                alt={`${title} cover`}
                width={800}
                height={800}
                unoptimized
                className="listenCover__img"
              />
            ) : (
              <div className="listenCover__art" role="img" aria-label={story?.genre ? `${story.genre} cover` : "Story cover"}>
                <span className="listenCover__moon" aria-hidden />
                <span className="listenCover__caption">
                  {poster.status === "generating" || (loading && !loadError) ? "Painting the cover…" : story?.genre || "Bedtime"}
                </span>
              </div>
            )}
          </div>
          {poster.status === "error" ? (
            <p className="listenHint" role="status">
              {poster.message}
              <button type="button" className="listenRetry" onClick={() => void generatePoster()}>
                Try cover again
              </button>
            </p>
          ) : null}
          {poster.status === "ready" && poster.outcome === "text_fallback" ? (
            <p className="listenHint">
              Simple cover — illustrated artwork was unavailable.
              <button type="button" className="listenRetry" onClick={() => void generatePoster()}>
                Try cover again
              </button>
            </p>
          ) : null}

          <h1 className="listenTitle">{title}</h1>
          {creditLine ? <p className="listenMeta">{creditLine}</p> : null}
          {story && !loadError ? (
            <p className="listenSaved">
              <IconCheck />
              Saved to My Stories
            </p>
          ) : null}

          <p className={`listenStatus${audioError ? " listenStatus--error" : ""}`} role="status">
            {audioError ? (
              <>
                {audioError}
                <button type="button" className="listenRetry" onClick={() => void onTogglePlay()}>
                  Try again
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
              disabled={!savedAudioUrl || isMakingMp3}
              aria-label="Timeline"
              aria-valuemin={0}
              aria-valuemax={Math.round(seekMax || 0)}
              aria-valuenow={Math.round(seekValue || 0)}
              aria-valuetext={
                savedAudioUrl
                  ? `${formatClock(seekValue)} of ${knownDuration ? formatClock(duration) : "unknown length"}`
                  : "No audio yet"
              }
            />
            <div className="listenTimes">
              <span>{formatClock(savedAudioUrl ? seekValue : 0)}</span>
              <span>{knownDuration ? formatClock(duration) : "–:––"}</span>
            </div>
          </div>

          <div className="listenTransport">
            <button
              type="button"
              className="listenSkip"
              aria-label="Back 15 seconds"
              onClick={() => skip(-15)}
              disabled={!savedAudioUrl || isMakingMp3}
            >
              <span aria-hidden>−15</span>
            </button>
            <button
              type="button"
              className="listenPlay"
              onClick={() => void onTogglePlay()}
              disabled={!story || isMakingMp3 || Boolean(loadError)}
              aria-label={playLabel}
              aria-busy={isMakingMp3}
            >
              {isMakingMp3 ? (
                <span className="listenSpinner" />
              ) : playing ? (
                <span className="listenPause" aria-hidden />
              ) : (
                <span className="listenTriangle" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="listenSkip"
              aria-label="Forward 15 seconds"
              onClick={() => skip(15)}
              disabled={!savedAudioUrl || isMakingMp3}
            >
              <span aria-hidden>+15</span>
            </button>
          </div>

          <div className="listenTools">
            <div className="listenSpeed">
              <button
                type="button"
                className="listenSpeed__button"
                aria-haspopup="listbox"
                aria-expanded={speedOpen}
                aria-label={`Playback speed ${formatRate(playbackRate)}`}
                onClick={() => setSpeedOpen((open) => !open)}
              >
                {formatRate(playbackRate)}
                <span className="listenSpeed__caret" aria-hidden>
                  ▾
                </span>
              </button>
              {speedOpen ? (
                <ul className="listenSpeed__menu" role="listbox" aria-label="Playback speed">
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
              Narration
            </button>
          </div>

          <section className="listenScriptCard" aria-label="Read story">
            <button
              type="button"
              className="listenScript"
              aria-expanded={scriptOpen}
              onClick={() => setScriptOpen((open) => !open)}
            >
              <IconBook />
              <span>Read story</span>
              <IconChevron down={!scriptOpen} />
            </button>
            {scriptOpen ? (
              <div className="listenScript__body">
                {loading ? <p className="listenHint">Loading the script…</p> : null}
                {story?.text ? <p className="listenScript__text">{story.text}</p> : null}
                {!loading && !story?.text ? <p className="listenHint">This story has no script yet.</p> : null}
              </div>
            ) : null}
          </section>

          <audio
            ref={audioRef}
            preload="metadata"
            playsInline
            className="listenAudio"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
          />
        </div>
      </div>

      {moreOpen ? (
        <QuietSheet title="Story actions" onClose={() => setMoreOpen(false)}>
          <button
            type="button"
            className="sheetAction"
            onClick={() => void generatePoster()}
            disabled={!story || poster.status === "generating"}
          >
            {poster.status === "generating" ? "Painting the cover…" : "New cover artwork"}
          </button>
          <button
            type="button"
            className="sheetAction"
            onClick={() => void onDownloadKeepsake().catch(() => {})}
            disabled={!story || poster.status === "generating"}
          >
            {poster.status === "ready" ? "Download keepsake poster" : "Create keepsake poster"}
          </button>
          {coverFailed ? (
            <button
              type="button"
              className="sheetAction"
              onClick={() => void generatePoster()}
            >
              Try cover again
            </button>
          ) : null}
          <p className="listenHint">Artwork and the keepsake use this story. Narration stays available either way.</p>
        </QuietSheet>
      ) : null}

      {narrationOpen ? (
        <QuietSheet title="Narration" onClose={() => setNarrationOpen(false)}>
          <label className="createSheet__field">
            <span className="createScreen__label">Voice</span>
            <select
              value={selectedVoiceId}
              onChange={(event) => setSelectedVoiceId(event.target.value)}
              disabled={isLoadingVoices || isMakingMp3}
            >
              {isLoadingVoices ? <option value="">Loading voices…</option> : null}
              {voicesError ? <option value="">Voices unavailable</option> : null}
              {!isLoadingVoices && !voicesError
                ? voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {friendlyVoiceName(voice) || voice.id}
                      {voice.language ? ` · ${languageLabel(voice.language)}` : ""}
                    </option>
                  ))
                : null}
            </select>
            {voicesError ? (
              <button className="listenRetry" type="button" onClick={() => void fetchVoices()}>
                Retry voices
              </button>
            ) : null}
          </label>
          <TtsControls
            speed={narrationSpeed}
            emotion={emotion}
            onSpeedChange={setNarrationSpeed}
            onEmotionChange={setEmotion}
          />
          <button
            type="button"
            className="sheetAction sheetAction--last"
            onClick={() => void onRegenerate()}
            disabled={!story || isMakingMp3}
          >
            {isMakingMp3 ? "Regenerating narration…" : "Regenerate narration"}
          </button>
          <p className="listenHint">Regenerate replaces the saved narration for this story. Playback speed does not.</p>
        </QuietSheet>
      ) : null}
    </main>
  );
}
