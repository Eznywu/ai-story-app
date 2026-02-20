"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type StoryRow = {
  id: string;
  title: string | null;
  genre: string;
  length: string;
  story: string;
  createdAt?: string;
};

const AGE_OPTIONS = [
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "9m", label: "9 months" },
  { value: "1y", label: "1 year old" },
  { value: "2y", label: "2 years old" },
];

const LANG_OPTIONS = [
  { value: "zh", label: "中文（繁體）" },
  { value: "en", label: "English" },
] as const;

const GENRE_OPTIONS = [
  "Animals",
  "Bedtime",
  "Fantasy",
  "Adventure",
  "Friendship",
  "Space",
  "Dinosaurs",
];

const LENGTH_OPTIONS = [
  { value: "short", label: "Short (1–2 min)" },
  { value: "medium", label: "Medium (3–5 min)" },
  { value: "long", label: "Long (6–8 min)" },
];

function card(): React.CSSProperties {
  return { border: "1px solid #e6e6e6", borderRadius: 16, padding: 18 };
}
function input(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    fontSize: 16,
  };
}
function select(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    fontSize: 16,
    background: "white",
  };
}
function btn(opts?: { primary?: boolean }): React.CSSProperties {
  const primary = opts?.primary;
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: primary ? "black" : "white",
    color: primary ? "white" : "black",
    cursor: "pointer",
    fontWeight: 700,
  };
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 700, marginTop: 14, marginBottom: 6 }}>{children}</div>;
}

export default function Page() {
  // Criteria
  const [age, setAge] = useState("6m");
  const [language, setLanguage] = useState<(typeof LANG_OPTIONS)[number]["value"]>("zh");
  const [mainCharacter, setMainCharacter] = useState("嗚嗚");

  // Base fields
  const [genre, setGenre] = useState("Animals");
  const [length, setLength] = useState("short");
  const [title, setTitle] = useState("Test");

  // Story + loading
  const [story, setStory] = useState("");
  const [busyGenerate, setBusyGenerate] = useState(false);

  // MP3 playback
  const [busyMp3, setBusyMp3] = useState(false);
  const [mp3Url, setMp3Url] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Library
  const [library, setLibrary] = useState<StoryRow[]>([]);
  const [busyLibrary, setBusyLibrary] = useState(false);

  const ageLabel = useMemo(
    () => AGE_OPTIONS.find((x) => x.value === age)?.label ?? age,
    [age]
  );

  function stopAudio() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }

  async function refreshLibrary() {
    setBusyLibrary(true);
    try {
      const res = await fetch("/api/stories", { cache: "no-store" });
      const data = await res.json();
      setLibrary(Array.isArray(data) ? data : []);
    } catch {
      setLibrary([]);
    } finally {
      setBusyLibrary(false);
    }
  }

  useEffect(() => {
    refreshLibrary();
  }, []);

  async function generateStory() {
    setBusyGenerate(true);
    setStory("");
    setMp3Url("");
    stopAudio();

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          length,
          age,
          language,
          mainCharacter,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generate failed");
      setStory(data?.story || "");
    } catch (e: any) {
      alert(e?.message ?? "Generate failed");
    } finally {
      setBusyGenerate(false);
    }
  }

  async function saveStory() {
    if (!story) return;
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          genre,
          length,
          story,
          age,
          language,
          mainCharacter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      await refreshLibrary();
      alert("Saved!");
    } catch (e: any) {
      alert(e?.message ?? "Save failed");
    }
  }

  // ✅ This uses your ElevenLabs cloned voice via /api/eleven-tts
  async function makeMp3() {
    if (!story) return;

    setBusyMp3(true);
    setMp3Url("");
    stopAudio();

    try {
      const res = await fetch("/api/eleven-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: story }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Eleven TTS failed");
      }

      const blob = await res.blob(); // audio/mpeg
      const url = URL.createObjectURL(blob);
      setMp3Url(url);

      // optional autoplay
      setTimeout(() => audioRef.current?.play(), 50);
    } catch (e: any) {
      alert(e?.message ?? "MP3 failed");
    } finally {
      setBusyMp3(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 56, margin: "10px 0 8px" }}>My AI Story App</h1>
      <p style={{ fontSize: 18, color: "#666", marginTop: 0 }}>
        Generate a baby-friendly story and read it out loud as MP3 (your ElevenLabs cloned voice).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 18,
          marginTop: 18,
        }}
      >
        {/* Create */}
        <section style={card()}>
          <h2 style={{ marginTop: 0 }}>Create</h2>

          <Label>For what age</Label>
          <select value={age} onChange={(e) => setAge(e.target.value)} style={select()}>
            {AGE_OPTIONS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>

          <Label>Language</Label>
          <select value={language} onChange={(e) => setLanguage(e.target.value as any)} style={select()}>
            {LANG_OPTIONS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>

          <Label>Main character name</Label>
          <input
            value={mainCharacter}
            onChange={(e) => setMainCharacter(e.target.value)}
            placeholder="e.g., 嗚嗚 / Eason / Luna"
            style={input()}
          />

          <Label>Story type (genre)</Label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} style={select()}>
            {GENRE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <Label>Length</Label>
          <select value={length} onChange={(e) => setLength(e.target.value)} style={select()}>
            {LENGTH_OPTIONS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>

          <Label>Title</Label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={input()} />

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button disabled={busyGenerate} onClick={generateStory} style={btn({ primary: true })}>
              {busyGenerate ? "Generating..." : "Generate"}
            </button>

            <button disabled={!story} onClick={saveStory} style={btn()}>
              Save
            </button>

            <button disabled={!story || busyMp3} onClick={makeMp3} style={btn()}>
              {busyMp3 ? "Making MP3..." : "Make MP3 (My Voice)"}
            </button>

            <button disabled={!mp3Url} onClick={() => audioRef.current?.play()} style={btn()}>
              Play
            </button>

            <button onClick={stopAudio} style={btn()}>
              Stop
            </button>
          </div>

          <div style={{ marginTop: 14, color: "#666", fontSize: 14 }}>
            Selected: <b>{ageLabel}</b> • <b>{language}</b> • Main character: <b>{mainCharacter || "—"}</b>
          </div>

          <div style={{ marginTop: 14 }}>
            {story ? (
              <div
                style={{
                  border: "1px solid #ececec",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fafafa",
                  maxHeight: 360,
                  overflow: "auto",
                }}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{story}</pre>
              </div>
            ) : (
              <div style={{ color: "#666" }}>No story yet — choose options and hit Generate.</div>
            )}
          </div>

          {mp3Url ? (
            <div style={{ marginTop: 12 }}>
              <audio ref={audioRef} controls src={mp3Url} />
              <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
                (This audio is generated from <code>/api/eleven-tts</code>)
              </div>
            </div>
          ) : null}
        </section>

        {/* Library */}
        <section style={card()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ marginTop: 0 }}>My Library</h2>
            <button disabled={busyLibrary} onClick={refreshLibrary} style={btn()}>
              {busyLibrary ? "..." : "Refresh"}
            </button>
          </div>

          {library.length === 0 ? (
            <p style={{ color: "#666" }}>
              No saved stories yet (or your /api/stories isn’t deployed locally). Generate one and hit Save.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {library.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 14,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {s.title || "(Untitled)"}{" "}
                    <span style={{ color: "#666", fontWeight: 400, marginLeft: 8 }}>
                      {s.genre} • {s.length}
                    </span>
                  </div>
                  <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>
                    {s.story.slice(0, 140)}
                    {s.story.length > 140 ? "…" : ""}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      style={btn()}
                      onClick={() => {
                        setTitle(s.title || "");
                        setGenre(s.genre);
                        setLength(s.length);
                        setStory(s.story);
                        setMp3Url("");
                        stopAudio();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Load
                    </button>

                    <button
                      style={btn()}
                      onClick={async () => {
                        setStory(s.story);
                        await makeMp3();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Make MP3 (My Voice)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
