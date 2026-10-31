"use client";

import React, { useState } from "react";
import { BrandMark } from "@/app/components/BrandMark";
import { STORY_AGE_OPTIONS } from "@/lib/stories/storyAgeOptions";
import { BRAND_NAME } from "@/lib/brand";

type CreateKidPayload = {
  name: string;
  age: string;
  interests: string[];
};

type Props = {
  mode: "setup" | "returning";
  onFinish: (result: { skippedCreateKid: boolean; intent: "create_story" | null }) => void;
  onCreateKid: (payload: CreateKidPayload) => void;
};

const INTERESTS = ["Animals", "Adventure", "Fantasy", "Friendship", "Magic", "Nature", "Space", "Bedtime"];

export function OnboardingFlow({ mode, onFinish, onCreateKid }: Props) {
  const [step, setStep] = useState<"child" | "privacy">(mode === "returning" ? "privacy" : "child");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [skippedCreateKid, setSkippedCreateKid] = useState(mode === "returning");
  const [nameError, setNameError] = useState("");
  const [ageError, setAgeError] = useState("");

  function toggleInterest(next: string) {
    setInterests((prev) => (prev.includes(next) ? prev.filter((item) => item !== next) : [...prev, next]));
  }

  function saveChild() {
    const trimmed = name.trim();
    let invalid = false;
    if (!trimmed) {
      setNameError("Add a nickname to continue, or skip this step.");
      invalid = true;
    } else setNameError("");
    if (!age) {
      setAgeError("Choose an age. The unit is part of each choice.");
      invalid = true;
    } else setAgeError("");
    if (invalid) return;
    onCreateKid({ name: trimmed, age, interests });
    setSkippedCreateKid(false);
    setStep("privacy");
  }

  if (step === "child") {
    return (
      <div className="onboardingFlow">
        <div className="onboardingCard">
          <BrandMark variant="onDark" className="onboardingMark" label={null} />
          <p className="onboardingEyebrow">{BRAND_NAME}</p>
          <h1 className="onboardingTitle">Who is the story for?</h1>
          <p className="onboardingBody">A nickname and age are enough. Interests can wait.</p>
          <div className="fieldGrid">
            <label className="field">
              <span className="label">Nickname</span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="e.g. Momo"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "kid-name-error" : undefined}
                autoComplete="nickname"
              />
              {nameError ? (
                <span id="kid-name-error" className="fieldErrorText" role="alert">
                  {nameError}
                </span>
              ) : null}
            </label>
            <div className="field">
              <span className="label" id="kid-age-label">
                Age
              </span>
              <div className="profileModal__tags" role="listbox" aria-labelledby="kid-age-label">
                {STORY_AGE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`profileModal__tag${age === option ? " profileModal__tag--on" : ""}`}
                    aria-pressed={age === option}
                    onClick={() => {
                      setAge(option);
                      if (ageError) setAgeError("");
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {ageError ? (
                <span className="fieldErrorText" role="alert">
                  {ageError}
                </span>
              ) : null}
            </div>
            <div className="field">
              <span className="label">Interests, if you want</span>
              <div className="profileModal__tags">
                {INTERESTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`profileModal__tag${interests.includes(item) ? " profileModal__tag--on" : ""}`}
                    aria-pressed={interests.includes(item)}
                    onClick={() => toggleInterest(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="onboardingActions">
            <button className="button buttonPrimary" type="button" onClick={saveChild}>
              Continue
            </button>
            <button
              className="button"
              type="button"
              onClick={() => {
                setSkippedCreateKid(true);
                setStep("privacy");
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboardingFlow">
      <div className="onboardingCard">
        <p className="onboardingEyebrow">Before we begin</p>
        <h1 className="onboardingTitle">You choose what to share.</h1>
        <p className="onboardingBody">
          Stories stay in this library. A personal voice is optional, and the microphone is requested only when you
          decide to record. You can always use a narrator instead.
        </p>
        <p className="onboardingLegal">
          By continuing, you agree to our <a href="/legal/privacy">Privacy Policy</a> and <a href="/legal/terms">Terms</a>.
        </p>
        <div className="onboardingActions">
          <button
            className="button buttonPrimary"
            type="button"
            onClick={() =>
              onFinish({
                skippedCreateKid,
                intent: mode === "returning" ? null : "create_story",
              })
            }
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
