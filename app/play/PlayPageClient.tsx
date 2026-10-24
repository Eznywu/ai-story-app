"use client";

import React, { useEffect, useState } from "react";
import { AppChromeBar } from "@/app/components/AppChromeBar";
import { BackButton } from "@/app/components/BackButton";
import "@/app/page.css";

import { LAST_AUDIO_TITLE_KEY, LAST_AUDIO_URL_KEY } from "@/lib/audio/lastAudio";

export function PlayPageClient() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setAudioUrl(sessionStorage.getItem(LAST_AUDIO_URL_KEY));
        setTitle(sessionStorage.getItem(LAST_AUDIO_TITLE_KEY) || "");
      } catch {
        setAudioUrl(null);
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <main className="pageRoot">
      <div className="overlay">
        <div className="container">
          <AppChromeBar />
          <header className="standalonePageHeader">
            <h1 className="title">Play</h1>
            <p className="subtitle">Listen to the last story audio you generated in the app.</p>
          </header>
          {audioUrl ? (
            <div className="panel playPagePanel">
              {title ? (
                <p className="playPageTitle" style={{ marginTop: 0, fontWeight: 800 }}>
                  {title}
                </p>
              ) : null}
              <audio className="playPageAudio" controls src={audioUrl} preload="metadata" />
            </div>
          ) : (
            <div className="panel">
              <p style={{ margin: 0, fontWeight: 650 }}>
                No audio yet. Create or open a story, then tap <strong>Play</strong>. Saved narration shows up here
                and in Library under Audio.
              </p>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <BackButton className="button">← Back</BackButton>
          </div>
        </div>
      </div>
    </main>
  );
}
