"use client";

import { useEffect, useRef, useState } from "react";

type StoryRow = {
  id: string;
  title: string;
  genre: string;
  length: string;
  text: string;
  createdAt: string;
};

export default function Home() {
  // --- Story generation + library ---
  const [genre, setGenre] = useState("fantasy");
  const [length, setLength] = useState("short");

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [library, setLibrary] = useState<StoryRow[]>([]);
  const [selected, setSelected] = useState<StoryRow | null>(null);

  // --- Browser speech (optional fallback) ---
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);

  // --- MP3 TTS ---
  const [voice, setVoice] = useState("alloy");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Voice recorder (mic) ---
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<string>("");

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
    loadLibrary();

    return () => {
      // cleanup object URLs on unmount
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLibrary() {
    const res = await fetch("/api/stories");
    const data = await res.json();
    setLibrary(Array.isArray(data) ? data : []);
  }

  async function generateStory() {
    try {
      setIsGenerating(true);

      // reset selection + audio
      setSelected(null);
      setStory("Generating...");
      setTitle("");
      stopBrowserSpeech();
      clearMp3();

      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, length }),
      });

      const text = await res.text();

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        setStory(`Server returned non-JSON:\n\n${text.slice(0, 800)}`);
        return;
      }

      if (!res.ok) {
        setStory(`Error: ${data?.error ?? "Failed to generate story"}`);
        return;
      }

      setStory(data.story);
      setTitle(`${genre.toUpperCase()} • ${new Date().toLocaleDateString()}`);
    } catch (err: any) {
      setStory(`Error: ${err?.message ?? "Failed to generate story"}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveStory() {
    if (!story || story === "Generating..." || story.startsWith("Error:")) return;

    try {
      setIsSaving(true);

      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled Story",
          genre,
          length,
          text: story,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error ?? "Failed to save");
        return;
      }

      await loadLibrary();
      setSelected(data);
    } finally {
      setIsSaving(false);
    }
  }

  // -----------------------
  // Browser speech controls
  // -----------------------
  function speakBrowser(textToSpeak: string) {
    if (!canSpeak || !textToSpeak) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(textToSpeak);
    u.rate = 1.0;
    u.pitch = 1.0;

    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(u);
  }

  function stopBrowserSpeech() {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  // -----------
  // MP3 controls
  // -----------
  function clearMp3() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
  }

  async function makeMp3AndPlay() {
    const textToRead = selected ? selected.text : story;
    if (!textToRead) return;

    try {
      setIsTtsLoading(true);
      stopBrowserSpeech();
      clearMp3();

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToRead, voice }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "TTS failed");
        return;
      }

      const blob = await res.blob(); // audio/mpeg
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // auto play
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 0);
    } finally {
      setIsTtsLoading(false);
    }
  }

  // -----------------
  // Recorder controls
  // -----------------
  async function startRecording() {
    setUploadStatus("");
    setRecordedBlob(null);

    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl("");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunks, { type: "audio/webm" });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
    };

    mr.start();
    setRecorder(mr);
    setRecording(true);
  }

  function stopRecording() {
    recorder?.stop();
    setRecording(false);
    setRecorder(null);
  }

  async function uploadRecording() {
    if (!recordedBlob) return;

    setUploadStatus("Uploading...");

    const form = new FormData();
    form.append(
      "file",
      new File([recordedBlob], "voice.webm", { type: "audio/webm" })
    );

    const res = await fetch("/api/voice-sample", {
      method: "POST",
      body: form,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setUploadStatus(`Upload failed: ${data?.error ?? "unknown error"}`);
      return;
    }

    setUploadStatus(`Uploaded ✅ (${data.filename})`);
  }

  // Current displayed text (selected story takes priority)
  const currentText = selected ? selected.text : story;

  return (
    <main style={{ padding: 24, maxWidth: 1040, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>My AI Story App</h1>
      <p style={{ marginTop: 0, marginBottom: 18, opacity: 0.8 }}>
        Generate stories, save them, and replay anytime.
      </p>

      {/* Voice recorder */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          border: "1px solid #eee",
          borderRadius: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Voice Recorder</h2>
        <p style={{ marginTop: 6, opacity: 0.75 }}>
          Record a short voice sample (10–30 seconds). We’ll store it (for now)
          and later you can connect it to custom voice narration if/when you have
          access.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!recording ? (
            <button
              onClick={startRecording}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🎙️ Start recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ⏹ Stop
            </button>
          )}

          <button
            onClick={uploadRecording}
            disabled={!recordedBlob}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              fontWeight: 600,
              cursor: recordedBlob ? "pointer" : "not-allowed",
              opacity: recordedBlob ? 1 : 0.5,
            }}
          >
            ⬆️ Upload sample
          </button>
        </div>

        {recordedUrl ? (
          <div style={{ marginTop: 12 }}>
            <audio controls src={recordedUrl} style={{ width: "100%" }} />
          </div>
        ) : null}

        {uploadStatus ? <p style={{ marginTop: 10 }}>{uploadStatus}</p> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: Create */}
        <div
          style={{
            display: "grid",
            gap: 12,
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 14,
            background: "#fafafa",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Create</h2>

          <label>
            Story type (genre)
            <br />
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              disabled={isGenerating}
            >
              <option value="fantasy">Fantasy</option>
              <option value="sci-fi">Sci-Fi</option>
              <option value="mystery">Mystery</option>
              <option value="romance">Romance</option>
              <option value="kids">Kids</option>
            </select>
          </label>

          <label>
            Length
            <br />
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              disabled={isGenerating}
            >
              <option value="short">Short (1–2 min)</option>
              <option value="medium">Medium (~5 min)</option>
              <option value="long">Long (10+ min)</option>
            </select>
          </label>

          <label>
            Title (edit if you want)
            <br />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a name..."
              style={{ width: "100%", padding: 10, marginTop: 6 }}
              disabled={isGenerating}
            />
          </label>

          <label>
            MP3 Voice
            <br />
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            >
              {[
                "alloy",
                "ash",
                "ballad",
                "coral",
                "echo",
                "fable",
                "onyx",
                "nova",
                "sage",
                "shimmer",
                "verse",
                "marin",
                "cedar",
              ].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={generateStory}
              disabled={isGenerating}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: isGenerating ? "not-allowed" : "pointer",
                fontWeight: 600,
                opacity: isGenerating ? 0.6 : 1,
              }}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>

            <button
              onClick={saveStory}
              disabled={
                isSaving ||
                !story ||
                story === "Generating..." ||
                story.startsWith("Error:")
              }
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: "pointer",
                fontWeight: 600,
                opacity:
                  isSaving ||
                  !story ||
                  story === "Generating..." ||
                  story.startsWith("Error:")
                    ? 0.5
                    : 1,
              }}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>

            {/* MP3 */}
            <button
              onClick={makeMp3AndPlay}
              disabled={!currentText || isTtsLoading}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: !currentText || isTtsLoading ? "not-allowed" : "pointer",
                fontWeight: 600,
                opacity: !currentText || isTtsLoading ? 0.5 : 1,
              }}
            >
              {isTtsLoading ? "Making MP3..." : "Make MP3"}
            </button>

            {/* Browser fallback */}
            <button
              onClick={() => speakBrowser(currentText)}
              disabled={!currentText || !canSpeak || isSpeaking}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor:
                  currentText && canSpeak && !isSpeaking
                    ? "pointer"
                    : "not-allowed",
                fontWeight: 600,
                opacity: !currentText || !canSpeak || isSpeaking ? 0.5 : 1,
              }}
            >
              Browser Play
            </button>

            <button
              onClick={stopBrowserSpeech}
              disabled={!canSpeak || !isSpeaking}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: canSpeak && isSpeaking ? "pointer" : "not-allowed",
                fontWeight: 600,
                opacity: canSpeak && isSpeaking ? 1 : 0.5,
              }}
            >
              Stop
            </button>
          </div>

          {/* Story text */}
          {currentText ? (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                padding: 16,
                border: "1px solid #eee",
                borderRadius: 14,
                background: "white",
                margin: 0,
                minHeight: 220,
              }}
            >
              {currentText}
            </pre>
          ) : (
            <p style={{ opacity: 0.7, margin: 0 }}>
              No story yet — choose options and hit Generate.
            </p>
          )}

          {/* MP3 player */}
          {audioUrl ? (
            <div style={{ marginTop: 12 }}>
              <audio
                ref={audioRef}
                controls
                src={audioUrl}
                style={{ width: "100%" }}
              />
            </div>
          ) : null}
        </div>

        {/* Right: Library */}
        <div
          style={{
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>My Library</h2>
            <button
              onClick={loadLibrary}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {library.length === 0 ? (
              <p style={{ opacity: 0.7, margin: 0 }}>
                No saved stories yet. Generate one and hit Save.
              </p>
            ) : (
              library.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelected(s);
                    setTitle(s.title);
                    setStory("");
                    stopBrowserSpeech();
                    clearMp3();
                  }}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #eee",
                    cursor: "pointer",
                    background: selected?.id === s.id ? "#f5f5f5" : "white",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{s.title}</div>
                  <div style={{ opacity: 0.7, fontSize: 13 }}>
                    {s.genre} • {s.length} •{" "}
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 18, opacity: 0.65, fontSize: 13 }}>
        Note: “Use my recorded voice for AI narration” typically requires a
        Custom Voice enrollment + explicit consent. This app stores your samples
        now so you’re ready for that upgrade later.
      </p>
    </main>
  );
}
