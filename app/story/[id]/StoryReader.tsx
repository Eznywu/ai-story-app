"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "@/app/page.css";
import { AppChromeBar } from "@/app/components/AppChromeBar";
import { TtsControls } from "@/app/components/TtsControls";
import { useTts } from "@/app/hooks/useTts";
import { useStoryLibrary } from "@/app/hooks/useStoryLibrary";
import { createStoryPoster } from "@/lib/posters/poster";
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

/**
 * Story page `/story/[id]`.
 * Top to bottom: poster, playback bar, narration controls, full script.
 * Play generates audio only when this story has none yet (avoids a surprise charge).
 * Playback speed is the audio element's rate and does not call ElevenLabs again.
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
      await next.play();
      setPlaying(true);
      if (story) onStoryPlayed(story.id, story.title?.trim() || "Story");
    } catch (error: unknown) {
      setAudioError(getErrorMessage(error, "Voice failed, try again."));
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
      setAudioError(getErrorMessage(error, "Voice failed, try again."));
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

  const title = story?.title?.trim() || "Bedtime story";

  return (
    <main className="pageRoot pageRoot--tabs storyPage">
      <div className="overlay overlay--withTabs">
        <div className="container storyReader">
          <AppChromeBar />
          <div className="storyReader__top">
            <Link href="/?tab=library" className="button storyReader__back">
              ← Library
            </Link>
            <h1 className="storyReader__title">{loading ? "Opening story…" : title}</h1>
          </div>

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

          <section className="storyReader__poster" aria-label="Poster">
            {poster.status === "ready" ? (
              <Image
                src={poster.url}
                alt={`Poster for ${title}`}
                width={800}
                height={1000}
                unoptimized
                className="storyReader__posterImg"
              />
            ) : (
              <div className="storyReader__posterPlaceholder" role="status">
                {poster.status === "generating" || (loading && !loadError) ? (
                  <>
                    <span className="spinner" aria-hidden />
                    <p>Painting the poster…</p>
                  </>
                ) : poster.status === "error" ? (
                  <>
                    <p>{poster.message}</p>
                    <button className="button buttonPrimary" type="button" onClick={() => void generatePoster()}>
                      Retry poster
                    </button>
                  </>
                ) : (
                  <>
                    <p>Poster not ready yet.</p>
                    <button
                      className="button buttonPrimary"
                      type="button"
                      onClick={() => void generatePoster()}
                      disabled={!story}
                    >
                      Make poster
                    </button>
                  </>
                )}
              </div>
            )}
            {poster.status === "ready" && poster.outcome === "text_fallback" ? (
              <p className="storyReader__hint">{poster.hint || "Simple cover — the illustrated poster was unavailable."}</p>
            ) : null}
            {poster.status === "ready" ? (
              <button className="button storyReader__posterRetry" type="button" onClick={() => void generatePoster()}>
                New poster
              </button>
            ) : null}
          </section>

          <section className="panel storyReader__player" aria-label="Audio player">
            <div className="storyReader__transport">
              <button
                type="button"
                className="button buttonPrimary storyReader__play"
                onClick={() => void onTogglePlay()}
                disabled={!story || isMakingMp3 || Boolean(loadError)}
                aria-label={playing ? "Pause" : savedAudioUrl ? "Play" : "Play and create audio"}
              >
                {isMakingMp3 ? "Preparing…" : playing ? "Pause" : "Play"}
              </button>
              <label className="storyReader__seek">
                <span className="visuallyHidden">Seek</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(progress, duration || 0)}
                  onChange={(event) => onSeek(Number(event.target.value))}
                  disabled={!savedAudioUrl || isMakingMp3}
                  aria-valuetext={savedAudioUrl ? `${Math.round(progress)} seconds` : "No audio yet"}
                />
              </label>
            </div>
            <div className="storyReader__rates" role="group" aria-label="Playback speed">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={`createPicker__chip${playbackRate === rate ? " createPicker__chip--active" : ""}`}
                  aria-pressed={playbackRate === rate}
                  onClick={() => setPlaybackRate(rate)}
                >
                  {formatRate(rate)}
                </button>
              ))}
            </div>
            {!savedAudioUrl && !isMakingMp3 ? (
              <p className="storyReader__hint">Tap Play to create the narration. Speed here only changes playback.</p>
            ) : null}
            {audioError ? (
              <div className="fieldErrorRow" role="alert">
                <span className="fieldErrorText">{audioError}</span>
                <button className="button buttonInline" type="button" onClick={() => void onTogglePlay()}>
                  Try again
                </button>
              </div>
            ) : null}
            <audio
              ref={audioRef}
              src={savedAudioUrl || undefined}
              preload="metadata"
              className="storyReader__audio"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
            />
          </section>

          <section className="storyReader__tts" aria-label="Narration settings">
            <h2 className="panelTitle">Narration</h2>
            <label className="field">
              <span className="label">Voice</span>
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
                        {voice.name ?? voice.id}
                      </option>
                    ))
                  : null}
              </select>
              {voicesError ? (
                <div className="fieldErrorRow" role="alert">
                  <span className="fieldErrorText">{voicesError}</span>
                  <button className="button buttonInline" type="button" onClick={() => void fetchVoices()}>
                    Retry voices
                  </button>
                </div>
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
              className="button buttonPrimary storyReader__regen"
              onClick={() => void onRegenerate()}
              disabled={!story || isMakingMp3}
            >
              {isMakingMp3 ? "Regenerating…" : "Regenerate audio"}
            </button>
          </section>

          <section className="panel storyReader__script" aria-label="Story script">
            <h2 className="panelTitle">Story</h2>
            {loading ? <p className="storyReader__hint">Loading the script…</p> : null}
            {story ? <p className="storyReader__text">{story.text}</p> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
