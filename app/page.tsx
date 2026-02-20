"use client";

import React, { useMemo, useRef, useState } from "react";

type AgeOption = {
  value: "3m" | "6m" | "9m" | "1y" | "2y";
  label: string;
  guidance: string;
};

type LangOption = {
  value: "en" | "zh";
  label: string;
};

const AGE_OPTIONS: AgeOption[] = [
  { value: "3m", label: "3 months", guidance: "Very short, soothing, repetitive sounds and simple words." },
  { value: "6m", label: "6 months", guidance: "Short, rhythmic, gentle repetition, easy-to-hear words." },
  { value: "9m", label: "9 months", guidance: "Simple scenes, a few actions, comforting repetition." },
  { value: "1y", label: "1 year", guidance: "Simple plot, clear actions, 1–2 new words repeated." },
  { value: "2y", label: "2 years", guidance: "Tiny story arc, feelings, simple lesson, playful language." },
];

const LANG_OPTIONS: LangOption[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文（繁體）" },
];

// 10 popular kids topics
const GENRES = [
  "Animals",
  "Bedtime & Sleep",
  "Friendship",
  "Adventure",
  "Fantasy",
  "Dinosaurs",
  "Space",
  "Princesses & Knights",
  "Vehicles",
  "Superheroes",
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Page() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form state
  const [age, setAge] = useState<AgeOption["value"]>("6m");
  const [language, setLanguage] = useState<LangOption["value"]>("en");
  const [characterName, setCharacterName] = useState("嚕嚕");
  const [genre, setGenre] = useState<(typeof GENRES)[number]>("Animals");
  const [length, setLength] = useState<"short" | "medium" | "long">("short");
  const [title, setTitle] = useState("");

  // Speed + emotion
  // speed here is for MP3 generation (ElevenLabs request) AND also we apply it to browser playbackRate
  const [speed, setSpeed] = useState(0.95); // 0.80–1.20
  const [emotion, setEmotion] = useState(40); // 0–100 (warmth/expressiveness)

  // Output state
  const [story, setStory] = useState("");
  const [mp3Url, setMp3Url] = useState<string | null>(null);

  const [busyStory, setBusyStory] = useState(false);
  const [busyMp3, setBusyMp3] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageInfo = useMemo(() => AGE_OPTIONS.find(a => a.value === age)!, [age]);

  // Apply playback speed instantly (optional but nice)
  const applyPlaybackRate = (rate: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = rate;
  };

  const onSpeedChange = (next: number) => {
    const v = Math.round(clamp(next, 0.8, 1.2) * 100) / 100;
    setSpeed(v);
    applyPlaybackRate(v);
  };

  const onEmotionChange = (next: number) => {
    setEmotion(clamp(Math.round(next), 0, 100));
  };

  async function generateStory() {
    setError(null);
    setBusyStory(true);

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: keep payload simple; avoid sending nested objects that cause "undefined level" bugs
        body: JSON.stringify({
          age: ageInfo.label,
          age_guidance: ageInfo.guidance,
          language,
          character_name: characterName?.trim() || "Lulu",
          genre,
          length,
          title: title?.trim() || "",
          // Optional: tell the model the intended tone (not required)
          bedtime_tone: "gentle, cozy, calming, bedtime storyteller",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Story API failed (${res.status})`);
      }

      if (!data?.story) {
        throw new Error("Story API returned no story text.");
      }

      setStory(String(data.story));

      // clear old audio when new story is generated
      if (mp3Url) URL.revokeObjectURL(mp3Url);
      setMp3Url(null);
    } catch (e: any) {
      setError(e?.message || "Failed to generate story.");
    } finally {
      setBusyStory(false);
    }
  }

  async function makeMp3() {
    setError(null);

    if (!story.trim()) {
      setError("Please generate a story first.");
      return;
    }

    setBusyMp3(true);

    try {
      // Emotion mapping (generic): higher emotion => higher "style"/lower stability
      // Your /api/eleven-tts route should forward these to ElevenLabs voice_settings.
      // If your route ignores them, MP3 still works (just less expressive).
      const voiceSettings = {
        // ElevenLabs typical fields: stability(0-1), similarity_boost(0-1), style(0-1), speaker_boost(boolean)
        stability: clamp(0.75 - emotion / 200, 0.2, 0.85),          // emotion ↑ => stability ↓
        similarity_boost: 0.85,
        style: clamp(emotion / 100, 0, 1),                           // emotion 0–100 => style 0–1
        speaker_boost: true,
      };

      const res = await fetch("/api/eleven-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: story,
          // interpret speed as "speaking rate" for your server (if supported) AND also for client playback
          speed,
          emotion,
          voice_settings: voiceSettings,
          // If your route supports passing model_id etc:
          model_id: language === "zh" ? "eleven_multilingual_v2" : "eleven_multilingual_v2",
        }),
      });

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        throw new Error(maybeJson?.error || `TTS failed (${res.status})`);
      }

      const blob = await res.blob();
      if (!blob || blob.size < 1000) {
        throw new Error("TTS returned an empty/invalid audio file.");
      }

      if (mp3Url) URL.revokeObjectURL(mp3Url);
      const url = URL.createObjectURL(blob);
      setMp3Url(url);

      // Update audio element
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          audioRef.current.playbackRate = speed;
        }
      }, 50);
    } catch (e: any) {
      setError(e?.message || "Failed to create MP3.");
    } finally {
      setBusyMp3(false);
    }
  }

  const play = () => audioRef.current?.play();
  const stop = () => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  };

  return (
    <div className="lulu-bg">
      <div className="lulu-overlay" />

      <main className="lulu-shell">
        <header className="lulu-header">
          <h1 className="lulu-title">Bedtime Story</h1>
          <p className="lulu-sub">
            Generate a cozy story, then turn it into bedtime audio with your ElevenLabs voice.
          </p>
        </header>

        <section className="lulu-grid">
          {/* LEFT: Create */}
          <div className="card">
            <div className="cardTitle">Create</div>

            <label className="field">
              <span className="label">For what age</span>
              <select className="input" value={age} onChange={(e) => setAge(e.target.value as any)}>
                {AGE_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <div className="hint">{ageInfo.guidance}</div>
            </label>

            <label className="field">
              <span className="label">Language</span>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value as any)}>
                {LANG_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="label">Main character name</span>
              <input
                className="input"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="e.g. Lulu / 嚕嚕"
              />
            </label>

            <label className="field">
              <span className="label">Story type</span>
              <select className="input" value={genre} onChange={(e) => setGenre(e.target.value as any)}>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="label">Length</span>
              <select className="input" value={length} onChange={(e) => setLength(e.target.value as any)}>
                <option value="short">Short (1–2 min)</option>
                <option value="medium">Medium (3–4 min)</option>
                <option value="long">Long (5–7 min)</option>
              </select>
            </label>

            <label className="field">
              <span className="label">Title (optional)</span>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lulu and the Moon"
              />
            </label>

            {/* Buttons row with Speed + Emotion next to Generate */}
            <div className="actionsRow">
              <button
                className="btn primary"
                onClick={generateStory}
                disabled={busyStory}
                title="Generate story text"
              >
                {busyStory ? "Generating..." : "Generate"}
              </button>

              <div className="miniControl">
                <div className="miniLabel">Speed</div>
                <div className="stepper">
                  <button className="stepBtn" onClick={() => onSpeedChange(speed - 0.05)}>-</button>
                  <div className="stepVal">{speed.toFixed(2)}x</div>
                  <button className="stepBtn" onClick={() => onSpeedChange(speed + 0.05)}>+</button>
                </div>
              </div>

              <div className="miniControl">
                <div className="miniLabel">Emotion</div>
                <div className="stepper">
                  <button className="stepBtn" onClick={() => onEmotionChange(emotion - 10)}>-</button>
                  <div className="stepVal">Warm · {emotion}%</div>
                  <button className="stepBtn" onClick={() => onEmotionChange(emotion + 10)}>+</button>
                </div>
              </div>

              <button
                className="btn"
                onClick={makeMp3}
                disabled={busyMp3}
                title="Generate MP3 from the current story using the current Speed/Emotion"
              >
                {busyMp3 ? "Making MP3..." : "Make MP3"}
              </button>
            </div>

            {error && <div className="errorBox">{error}</div>}

            <div className="storyBox">
              <div className="storyHint">{story ? "Story generated:" : "(Your story will appear here)"}</div>
              <pre className="storyText">{story}</pre>
            </div>
          </div>

          {/* RIGHT: Playback on top of Story Output */}
          <div className="rightCol">
            <div className="card playbackCard">
              <div className="cardTitle">Playback</div>
              <audio ref={audioRef} controls className="audio" src={mp3Url ?? undefined} />
              <div className="playButtons">
                <button className="btn small" onClick={play} disabled={!mp3Url}>Play</button>
                <button className="btn small" onClick={stop} disabled={!mp3Url}>Stop</button>
              </div>
              <div className="hint">
                Tip: Speed/Emotion apply when generating audio (Make MP3). Speed also updates playback rate.
              </div>
            </div>

            <div className="card">
              <div className="cardTitle">Story Output</div>
              <div className="outputBox">
                {story ? (
                  <div className="outputText">{story}</div>
                ) : (
                  <div className="outputPlaceholder">Generate a story to see it here.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="lulu-footer">
          Background: /public/lulu-bg.jpg · Font: Arial Rounded MT (fallbacks included)
        </footer>

        <style jsx>{`
          /* Page-specific layout sizing (smaller interface) */
          .lulu-bg {
            min-height: 100vh;
            background-image: url("/lulu-bg.jpg");
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            position: relative;
            font-family: "Arial Rounded MT Bold","Arial Rounded MT","Arial Rounded MT Std","Arial Rounded", Arial, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          }
          .lulu-overlay {
            position: absolute;
            inset: 0;
            background: rgba(255,255,255,0.22);
            backdrop-filter: blur(2px);
          }
          .lulu-shell {
            position: relative;
            max-width: 1000px;
            margin: 0 auto;
            padding: 22px 16px 18px;
          }
          .lulu-header { margin-bottom: 12px; }
          .lulu-title {
            margin: 0;
            font-size: 44px;
            font-weight: 900;
            letter-spacing: 0.2px;
            color: #111;
          }
          .lulu-sub {
            margin: 6px 0 0;
            font-size: 14px;
            color: rgba(0,0,0,0.7);
            font-weight: 600;
          }
          .lulu-grid {
            display: grid;
            grid-template-columns: 1.05fr 0.95fr;
            gap: 14px;
            align-items: start;
          }
          .rightCol {
            display: grid;
            gap: 14px;
          }
          .card {
            background: rgba(255,255,255,0.82);
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 16px;
            padding: 14px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          }
          .cardTitle {
            font-size: 16px;
            font-weight: 900;
            margin-bottom: 10px;
            color: #111;
          }
          .field { display: block; margin-bottom: 10px; }
          .label {
            display: block;
            font-size: 12px;
            font-weight: 900;
            margin-bottom: 6px;
            color: rgba(0,0,0,0.75);
          }
          .input {
            width: 100%;
            height: 40px;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.12);
            padding: 0 12px;
            font-size: 14px;
            background: rgba(255,255,255,0.95);
            outline: none;
          }
          .input:focus {
            border-color: rgba(18, 130, 255, 0.45);
            box-shadow: 0 0 0 3px rgba(18, 130, 255, 0.15);
          }
          .hint {
            margin-top: 6px;
            font-size: 12px;
            color: rgba(0,0,0,0.6);
            font-weight: 600;
            line-height: 1.25;
          }

          .actionsRow {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            margin-top: 6px;
            margin-bottom: 10px;
          }

          .btn {
            height: 40px;
            padding: 0 14px;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.12);
            background: rgba(255,255,255,0.95);
            font-weight: 900;
            cursor: pointer;
          }
          .btn:hover { filter: brightness(0.98); }
          .btn:disabled { opacity: 0.6; cursor: not-allowed; }

          .btn.primary {
            background: linear-gradient(180deg, rgba(40, 200, 130, 1), rgba(25, 160, 105, 1));
            border: none;
            color: #fff;
            box-shadow: 0 10px 24px rgba(25,160,105,0.25);
          }
          .btn.small { height: 36px; border-radius: 10px; padding: 0 12px; }

          .miniControl {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 6px 8px;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.10);
            background: rgba(255,255,255,0.75);
          }
          .miniLabel {
            font-size: 11px;
            font-weight: 900;
            color: rgba(0,0,0,0.70);
            line-height: 1;
          }
          .stepper {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .stepBtn {
            width: 30px;
            height: 30px;
            border-radius: 10px;
            border: 1px solid rgba(0,0,0,0.12);
            background: rgba(255,255,255,0.9);
            font-weight: 900;
            cursor: pointer;
          }
          .stepVal {
            min-width: 92px;
            text-align: center;
            font-size: 13px;
            font-weight: 900;
            color: rgba(0,0,0,0.78);
          }

          .errorBox {
            margin-top: 8px;
            background: rgba(255, 80, 80, 0.12);
            border: 1px solid rgba(255, 80, 80, 0.35);
            color: rgba(120, 0, 0, 0.9);
            padding: 10px 12px;
            border-radius: 12px;
            font-weight: 800;
            font-size: 13px;
          }

          .storyBox {
            margin-top: 10px;
            border-radius: 14px;
            border: 1px solid rgba(0,0,0,0.10);
            background: rgba(255,255,255,0.80);
            padding: 12px;
          }
          .storyHint {
            font-size: 12px;
            font-weight: 900;
            color: rgba(0,0,0,0.55);
            margin-bottom: 8px;
          }
          .storyText {
            margin: 0;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.55;
            color: rgba(0,0,0,0.82);
            max-height: 220px;
            overflow: auto;
          }

          .playbackCard .audio {
            width: 100%;
            margin-top: 6px;
          }
          .playButtons {
            display: flex;
            gap: 10px;
            margin-top: 10px;
          }

          .outputBox {
            border-radius: 14px;
            border: 1px solid rgba(0,0,0,0.10);
            background: rgba(255,255,255,0.78);
            padding: 12px;
            min-height: 340px;
            max-height: 460px;
            overflow: auto;
          }
          .outputText {
            white-space: pre-wrap;
            font-size: 15px;
            line-height: 1.6;
            color: rgba(0,0,0,0.82);
            font-weight: 600;
          }
          .outputPlaceholder {
            font-size: 14px;
            font-weight: 800;
            color: rgba(0,0,0,0.45);
          }

          .lulu-footer {
            margin-top: 12px;
            font-size: 11px;
            font-weight: 800;
            color: rgba(0,0,0,0.55);
          }

          @media (max-width: 920px) {
            .lulu-grid { grid-template-columns: 1fr; }
            .outputBox { min-height: 220px; }
          }
        `}</style>
      </main>
    </div>
  );
}