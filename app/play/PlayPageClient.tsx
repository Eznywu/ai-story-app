"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppChromeBar } from "@/app/components/AppChromeBar";
import "@/app/page.css";

const URL_KEY = "emrsy.lastAudioUrl";
const TITLE_KEY = "emrsy.lastAudioTitle";

export function PlayPageClient() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    try {
      setAudioUrl(sessionStorage.getItem(URL_KEY));
      setTitle(sessionStorage.getItem(TITLE_KEY) || "");
    } catch {
      setAudioUrl(null);
    }
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
                No audio yet. Open the app, create or open a story, then use <strong>Make MP3</strong> (or play from
                Library). Your audio will appear here.
              </p>
            </div>
          )}
          <p style={{ marginTop: 16 }}>
            <Link href="/" className="button">
              ← Back to app
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
