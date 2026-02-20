// app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type StoryItem = {
  id?: string;
  title?: string;
  genre?: string;
  age?: string;
  language?: string;
  mainCharacterName?: string;
  story?: string;
  createdAt?: string;
};

const AGE_OPTIONS = ["3 months", "6 months", "9 months", "1 year", "2 years"];
const LANG_OPTIONS = [
  { label: "English", value: "en" },
  { label: "中文（繁體）", value: "zh-Hant" },
];
const GENRE_OPTIONS = ["Animals", "Adventure", "Fantasy", "Friendship", "Family", "Magic", "Nature", "Space", "Underwater", "Holiday", "Fairy Tale", ,"Mystery", "Superhero", "Bedtime Classic"];
const LENGTH_OPTIONS = [
  { label: "Short (1–2 min)", value: "short" },
  { label: "Medium (3–5 min)", value: "medium" },
  { label: "Long (6–9 min)", value: "long" },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Page() {
  // Left form
  const [age, setAge] = useState<string>("6 months");
  const [language, setLanguage] = useState<string>("zh-Hant");
  const [mainCharacterName, setMainCharacterName] = useState<string>("嚕嚕");
  const [genre, setGenre] = useState<string>("Animals");
  const [length, setLength] = useState<string>("short");
  const [title, setTitle] = useState<string>("");

  // Right controls
  const [speed, setSpeed] = useState<number>(0.95); // 0.6–1.3
  const [emotion, setEmotion] = useState<number>(40); // 0–100

  // Output + audio
  const [story, setStory] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMakingMp3, setIsMakingMp3] = useState<boolean>(false);

  const [audioUrl, setAudioUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Library (bottom)
  const [library, setLibrary] = useState<StoryItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState<boolean>(false);

  const bgStyle = useMemo<React.CSSProperties>(() => {
    return {
      minHeight: "100vh",
      backgroundImage: "url('/lulu-bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }, []);

  const fontStyle = useMemo<React.CSSProperties>(
    () => ({
      fontFamily:
        '"Arial Rounded MT Bold","Arial Rounded MT","Trebuchet MS",Arial,sans-serif',
    }),
    []
  );

  async function generateStory() {
    setError("");
    setIsGenerating(true);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age,
          language,
          mainCharacterName,
          genre,
          length,
          title,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Story API failed (${res.status})`);
      }
      setStory(String(data?.story ?? ""));
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate story.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveStory() {
    setError("");
    setIsSaving(true);
    try {
      // If you don't have /api/stories implemented on prod yet,
      // this may fail — that's okay; generation + MP3 still works.
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age,
          language,
          mainCharacterName,
          genre,
          length,
          title,
          story,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }
      await refreshLibrary();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshLibrary() {
    setError("");
    setLoadingLibrary(true);
    try {
      const res = await fetch("/api/stories", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Fetch library failed (${res.status})`);
      }
      setLibrary(Array.isArray(data?.stories) ? data.stories : []);
    } catch (e: any) {
      // Not fatal
      setLibrary([]);
    } finally {
      setLoadingLibrary(false);
    }
  }

  async function makeMp3() {
    setError("");
    setIsMakingMp3(true);
    try {
      if (!story.trim()) throw new Error("Generate a story first.");

      // Expect your API route to accept { text, speed, emotion }.
      // If your /api/eleven-tts currently only accepts { text },
      // update that route later — UI still ready.
      const res = await fetch("/api/eleven-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: story,
          speed,
          emotion,
          // Optional: could pass language/voice style if you support it
          language,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `TTS failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // cleanup old
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });

      // autoplay
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 50);
    } catch (e: any) {
      setError(e?.message ?? "Failed to make MP3.");
    } finally {
      setIsMakingMp3(false);
    }
  }

  function play() {
    audioRef.current?.play().catch(() => {});
  }
  function stop() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }

  useEffect(() => {
    refreshLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Layout styles (no need to touch globals.css)
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(255,255,255,0.35)",
    borderRadius: 18,
    boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
    backdropFilter: "blur(6px)",
  };

  const label: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 800,
    opacity: 0.85,
    marginBottom: 6,
  };

  const select: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
    background: "rgba(255,255,255,0.9)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
    background: "rgba(255,255,255,0.9)",
  };

  const btn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.92)",
    fontWeight: 800,
    cursor: "pointer",
  };

  const primaryBtn: React.CSSProperties = {
    ...btn,
    background: "rgba(16, 185, 129, 0.92)", // emerald-ish
    color: "#0b2a1f",
    border: "1px solid rgba(0,0,0,0.10)",
  };

  return (
    <div style={{ ...bgStyle, ...fontStyle }}>
      {/* soft overlay */}
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 55%, rgba(0,0,0,0.05) 100%)",
          padding: "28px 18px 40px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1, color: "rgba(0,0,0,0.78)" }}>
                Bedtime Story
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.7, marginTop: 6 }}>
                Generate stories, save them, and turn them into bedtime audio with your ElevenLabs voice.
              </div>
            </div>

            {/* Playback card (top-right) */}
            <div style={{ ...card, padding: 14, width: 360 }}>
              <div style={{ fontWeight: 900, opacity: 0.8, marginBottom: 10 }}>Playback</div>
              <audio ref={audioRef} controls src={audioUrl} style={{ width: "100%" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button style={btn} onClick={play} type="button">
                  Play
                </button>
                <button style={btn} onClick={stop} type="button">
                  Stop
                </button>
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1.05fr 0.95fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* LEFT: Create */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10, opacity: 0.8 }}>Create</div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={label}>For what age</div>
                  <select style={select} value={age} onChange={(e) => setAge(e.target.value)}>
                    {AGE_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={label}>Language</div>
                  <select style={select} value={language} onChange={(e) => setLanguage(e.target.value)}>
                    {LANG_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={label}>Main character name</div>
                  <input
                    style={input}
                    value={mainCharacterName}
                    onChange={(e) => setMainCharacterName(e.target.value)}
                    placeholder="e.g. 嚕嚕"
                  />
                </div>

                <div>
                  <div style={label}>Story type (genre)</div>
                  <select style={select} value={genre} onChange={(e) => setGenre(e.target.value)}>
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={label}>Length</div>
                  <select style={select} value={length} onChange={(e) => setLength(e.target.value)}>
                    {LENGTH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={label}>Title (optional)</div>
                  <input
                    style={input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lulu and the Moon"
                  />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                  <button style={primaryBtn} onClick={generateStory} disabled={isGenerating} type="button">
                    {isGenerating ? "Generating..." : "Generate"}
                  </button>
                  <button style={btn} onClick={saveStory} disabled={isSaving || !story.trim()} type="button">
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button style={btn} onClick={makeMp3} disabled={isMakingMp3 || !story.trim()} type="button">
                    {isMakingMp3 ? "Making MP3..." : "Make MP3"}
                  </button>
                </div>

                {/* Error */}
                {error ? (
                  <div
                    style={{
                      marginTop: 6,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "rgba(153,27,27,0.95)",
                      fontWeight: 800,
                    }}
                  >
                    {error}
                  </div>
                ) : null}
              </div>
            </div>

            {/* RIGHT: Speed + Emotion + Story Output */}
            <div style={{ display: "grid", gap: 16 }}>
              {/* Controls */}
              <div style={{ ...card, padding: 16 }}>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ flex: "1 1 220px" }}>
                    <div style={label}>Speed</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        type="button"
                        style={btn}
                        onClick={() => setSpeed((s) => Number((clamp(s - 0.05, 0.6, 1.3)).toFixed(2)))}
                      >
                        −
                      </button>
                      <div style={{ fontWeight: 900, minWidth: 70 }}>{speed.toFixed(2)}x</div>
                      <button
                        type="button"
                        style={btn}
                        onClick={() => setSpeed((s) => Number((clamp(s + 0.05, 0.6, 1.3)).toFixed(2)))}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                      Tip: 0.85–1.00 feels like a calm bedtime pace.
                    </div>
                  </div>

                  <div style={{ flex: "1 1 220px" }}>
                    <div style={label}>Emotion</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button type="button" style={btn} onClick={() => setEmotion((v) => clamp(v - 5, 0, 100))}>
                        −
                      </button>
                      <div style={{ fontWeight: 900, minWidth: 120 }}>
                        Warm · {emotion}%
                      </div>
                      <button type="button" style={btn} onClick={() => setEmotion((v) => clamp(v + 5, 0, 100))}>
                        +
                      </button>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                      Higher = more expressive; 30–55 is usually “bedtime storyteller”.
                    </div>
                  </div>
                </div>
              </div>

              {/* Story Output */}
              <div style={{ ...card, padding: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10, opacity: 0.8 }}>
                  Story Output
                </div>
                <div
                  style={{
                    minHeight: 360,
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.10)",
                    background: "rgba(255,255,255,0.72)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.75,
                    fontWeight: 700,
                    opacity: story ? 0.95 : 0.65,
                  }}
                >
                  {story?.trim() ? story : "(Your story will appear here)"}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM: My Library */}
          <div style={{ ...card, padding: 16, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.8 }}>My Library</div>
              <button style={btn} onClick={refreshLibrary} disabled={loadingLibrary} type="button">
                {loadingLibrary ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6, fontWeight: 700 }}>
              If <code>/api/stories</code> isn’t deployed, this list may stay empty (generation & MP3 still work).
            </div>

            <div style={{ marginTop: 12 }}>
              {library.length === 0 ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px dashed rgba(0,0,0,0.18)",
                    background: "rgba(255,255,255,0.55)",
                    fontWeight: 800,
                    opacity: 0.8,
                  }}
                >
                  No saved stories yet.
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                    Tip: Put your background image at <code>/public/lulu-bg.jpg</code>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {library.slice(0, 20).map((s, idx) => (
                    <button
                      key={s.id ?? idx}
                      type="button"
                      onClick={() => {
                        setStory(s.story ?? "");
                        setTitle(s.title ?? "");
                        setGenre(s.genre ?? genre);
                        setAge(s.age ?? age);
                        setLanguage(s.language ?? language);
                        setMainCharacterName(s.mainCharacterName ?? mainCharacterName);
                      }}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "rgba(255,255,255,0.70)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 900, opacity: 0.85 }}>
                        {s.title?.trim() ? s.title : "(Untitled)"}{" "}
                        <span style={{ fontWeight: 800, opacity: 0.55, marginLeft: 8 }}>
                          {s.age ?? ""} · {s.genre ?? ""}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
                        {(s.story ?? "").slice(0, 120)}
                        {(s.story ?? "").length > 120 ? "…" : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* footer spacing */}
          <div style={{ height: 16 }} />
        </div>
      </div>
    </div>
  );
}