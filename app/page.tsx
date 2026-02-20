"use client";

import { useEffect, useMemo, useState } from "react";

type AgeOption = "3m" | "6m" | "9m" | "1y" | "2y";
type LangOption = "zh" | "en";
type LengthOption = "short" | "medium" | "long";

function ageLabel(age: AgeOption) {
  switch (age) {
    case "3m":
      return "3 months";
    case "6m":
      return "6 months";
    case "9m":
      return "9 months";
    case "1y":
      return "1 year old";
    case "2y":
      return "2 years old";
  }
}

function langLabel(lang: LangOption) {
  return lang === "zh" ? "中文（繁體）" : "English";
}

export default function Page() {
  // --- form ---
  const [age, setAge] = useState<AgeOption>("3m");
  const [language, setLanguage] = useState<LangOption>("zh");
  const [characterName, setCharacterName] = useState("嚕嚕");
  const [genre, setGenre] = useState("Animals");
  const [length, setLength] = useState<LengthOption>("short");
  const [title, setTitle] = useState("Test");

  // --- story output ---
  const [story, setStory] = useState("");
  const [loadingStory, setLoadingStory] = useState(false);

  // --- mp3 ---
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [loadingMp3, setLoadingMp3] = useState(false);

  // cleanup blob URLs
  useEffect(() => {
    return () => {
      if (audioUrl?.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // default title hint (optional)
  const suggestedTitle = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${langLabel(language)} · ${ageLabel(age)} · ${characterName} · ${genre} · ${yyyy}-${mm}-${dd}`;
  }, [age, language, characterName, genre]);

  async function generateStory() {
    setLoadingStory(true);
    setStory("");
    setAudioUrl("");

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age,
          language,
          characterName,
          genre,
          length,
          title: title?.trim() ? title.trim() : suggestedTitle,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Story API failed: ${res.status}`);
      }

      const data = await res.json();
      setStory(data.story ?? "");
    } catch (e: any) {
      setStory(`Error: ${e?.message ?? "Unknown error"}`);
    } finally {
      setLoadingStory(false);
    }
  }

  async function makeMp3() {
    if (!story || story.startsWith("Error:")) return;

    setLoadingMp3(true);
    setAudioUrl("");

    try {
      const res = await fetch("/api/eleven-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Use the story you just generated
          text: story,
          // Optional: pass language if your API route supports it
          language,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `TTS failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (e: any) {
      alert(e?.message ?? "Make MP3 failed");
    } finally {
      setLoadingMp3(false);
    }
  }

  function saveStoryLocal() {
    // Simple local save (safe + works even if your DB route changes)
    // You can later replace this with POST /api/stories if you want.
    try {
      const key = "lulu_saved_stories_v1";
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift({
        id: Date.now(),
        title: title?.trim() ? title.trim() : suggestedTitle,
        age,
        language,
        characterName,
        genre,
        length,
        story,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(arr));
      alert("Saved locally ✅ (on this device/browser)");
    } catch {
      alert("Save failed (localStorage blocked).");
    }
  }

  return (
    <div className="page">
      {/* Soft overlay so text stays readable */}
      <div className="overlay" />

      <div className="wrap">
        <h1 className="title">Bedtime Story</h1>

        <div className="layout">
          {/* LEFT PANEL */}
          <div className="leftPanel">
            <div className="formRow">
              <div className="label">For What Age:</div>
              <select className="input" value={age} onChange={(e) => setAge(e.target.value as AgeOption)}>
                <option value="3m">3 months</option>
                <option value="6m">6 months</option>
                <option value="9m">9 months</option>
                <option value="1y">1 year old</option>
                <option value="2y">2 years old</option>
              </select>
            </div>

            <div className="formRow">
              <div className="label">Language</div>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value as LangOption)}>
                <option value="zh">中文（繁體）</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="formRow">
              <div className="label">Main Character Name</div>
              <input
                className="input"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="例如：嚕嚕"
              />
            </div>

            <div className="formRow">
              <div className="label">Story Type</div>
              <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="Animals">Animals</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Adventure">Adventure</option>
                <option value="Friendship">Friendship</option>
                <option value="Bedtime">Bedtime</option>
              </select>
            </div>

            <div className="formRow">
              <div className="label">Length</div>
              <select className="input" value={length} onChange={(e) => setLength(e.target.value as LengthOption)}>
                <option value="short">Short (1–2 min)</option>
                <option value="medium">Medium (3–5 min)</option>
                <option value="long">Long (6–10 min)</option>
              </select>
            </div>

            <div className="formRow">
              <div className="label">Title</div>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={suggestedTitle} />
            </div>

            <div className="buttons">
              <button className="btn" onClick={generateStory} disabled={loadingStory}>
                {loadingStory ? "Generating..." : "Generate"}
              </button>

              <button className="btn" onClick={saveStoryLocal} disabled={!story || story.startsWith("Error:")}>
                Save
              </button>

              <button className="btn" onClick={makeMp3} disabled={!story || story.startsWith("Error:") || loadingMp3}>
                {loadingMp3 ? "Making..." : "Make MP3"}
              </button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="rightPanel">
            <div className="rightTop">
              <div className="rightTitle">Shows Story Output</div>

              <div className="audioFloat">
                <audio controls src={audioUrl || undefined} />
              </div>
            </div>

            <div className="storyCard">{story ? story : "Your story will appear here..."}</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          position: relative;
          background-image: url("/lulu-bg.jpg"); /* ✅ your image */
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          font-family: "Arial Rounded MT Bold", "Arial Rounded MT", "Arial", system-ui, sans-serif;
        }

        .overlay {
          position: absolute;
          inset: 0;
          /* Make left side more readable, keep right side more “image visible” */
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.62) 0%,
            rgba(255, 255, 255, 0.42) 45%,
            rgba(255, 255, 255, 0.26) 75%,
            rgba(255, 255, 255, 0.18) 100%
          );
          backdrop-filter: blur(1px);
        }

        .wrap {
          position: relative;
          z-index: 1;
          padding: 46px 64px;
        }

        .title {
          margin: 0 0 24px 0;
          font-size: 56px;
          font-weight: 900;
          color: #000;
          text-shadow: 0 2px 0 rgba(255, 255, 255, 0.6);
        }

        .layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 48px;
          align-items: start;
        }

        .leftPanel {
          padding: 12px 0;
        }

        .formRow {
          margin: 14px 0;
        }

        .label {
          font-size: 22px;
          font-weight: 900;
          color: #000;
          margin-bottom: 10px;
        }

        .input {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          border: 2px solid rgba(0, 0, 0, 0.15);
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(6px);
          padding: 0 14px;
          font-size: 18px;
          outline: none;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
        }

        .buttons {
          margin-top: 26px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          width: 240px;
        }

        .btn {
          height: 54px;
          border-radius: 12px;
          border: 2px solid rgba(0, 40, 60, 0.35);
          background: linear-gradient(180deg, #13b39a 0%, #0a9b87 100%);
          color: #fff;
          font-size: 30px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.18);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .rightPanel {
          padding-top: 86px; /* matches your mock: pushes “Shows Story Output” down */
          min-height: 520px;
        }

        .rightTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .rightTitle {
          font-size: 26px;
          font-weight: 900;
          color: #000;
          text-shadow: 0 2px 0 rgba(255, 255, 255, 0.55);
        }

        .audioFloat {
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.55);
          border: 2px solid rgba(0, 0, 0, 0.12);
          backdrop-filter: blur(8px);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12);
        }

        .storyCard {
          margin-top: 18px;
          max-width: 820px;
          min-height: 260px;
          padding: 18px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.55);
          border: 2px solid rgba(0, 0, 0, 0.12);
          backdrop-filter: blur(10px);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
          font-size: 18px;
          line-height: 1.6;
          white-space: pre-wrap;
          color: #000;
        }

        /* Mobile: stack */
        @media (max-width: 980px) {
          .wrap {
            padding: 22px 16px;
          }
          .layout {
            grid-template-columns: 1fr;
            gap: 18px;
          }
          .rightPanel {
            padding-top: 8px;
          }
          .buttons {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}