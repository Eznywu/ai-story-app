"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  previewUrl: string;
  voiceName: string;
  onVoiceNameChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string;
};

export function VoiceRecordingFlashCard(props: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current?.load();
  }, [props.previewUrl]);

  return (
    <div className="posterFlashBackdrop voiceRecordingFlashBackdrop">
      <button
        type="button"
        className="posterFlashBackdropDim"
        aria-label="Close voice preview"
        onClick={() => {
          if (!props.isSaving) props.onCancel();
        }}
      />
      <div
        className="posterFlashCard voiceRecordingFlashCard"
        role="dialog"
        aria-labelledby="voice-recording-flash-title"
        aria-modal="true"
      >
        <div className="posterFlashCardInner">
          <div className="posterFlashHeader">
            <div className="posterFlashTitle" id="voice-recording-flash-title">
              Your recording
            </div>
            <button
              className="posterFlashClose"
              type="button"
              onClick={props.onCancel}
              disabled={props.isSaving}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="posterFlashHint">Listen to the clip, name this voice, then save to add it to the Voice list.</p>
          <div className="voiceRecordingFlashAudioWrap">
            <audio ref={audioRef} className="voiceRecordingFlashAudio" src={props.previewUrl} controls preload="auto" />
          </div>
          <label className="voiceRecordingFlashNameField">
            <span className="label">Voice name</span>
            <input
              type="text"
              value={props.voiceName}
              onChange={(e) => props.onVoiceNameChange(e.target.value)}
              placeholder="e.g. Mom, Dad, Storyteller"
              disabled={props.isSaving}
              autoComplete="off"
            />
          </label>
          {props.error ? (
            <p className="fieldErrorText voiceRecordingFlashError" role="alert">
              {props.error}
            </p>
          ) : null}
          <div className="posterFlashActions voiceRecordingFlashActions">
            <button className="button buttonPrimary" type="button" onClick={props.onSave} disabled={props.isSaving}>
              {props.isSaving ? "Saving…" : "Save voice"}
            </button>
            <button className="button" type="button" onClick={props.onCancel} disabled={props.isSaving}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
