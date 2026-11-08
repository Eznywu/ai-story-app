"use client";

import React, { useState } from "react";
import { BrandMark } from "@/app/components/BrandMark";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
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
  const { messages } = useInterfaceLocale();
  const copy = messages.onboarding;
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
      setNameError(copy.nicknameError);
      invalid = true;
    } else setNameError("");
    if (!age) {
      setAgeError(copy.ageError);
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
          <h1 className="onboardingTitle">{copy.who}</h1>
          <p className="onboardingBody">{copy.whoBody}</p>
          <div className="fieldGrid">
            <label className="field">
              <span className="label">{copy.nickname}</span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder={copy.nicknamePlaceholder}
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
                {copy.age}
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
                    {messages.ages[option] || option}
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
              <span className="label">{copy.interests}</span>
              <div className="profileModal__tags">
                {INTERESTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`profileModal__tag${interests.includes(item) ? " profileModal__tag--on" : ""}`}
                    aria-pressed={interests.includes(item)}
                    onClick={() => toggleInterest(item)}
                  >
                    {item === "Bedtime" ? copy.bedtime : messages.voice.genres[item as keyof typeof messages.voice.genres] || item}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="onboardingActions">
            <button className="button buttonPrimary" type="button" onClick={saveChild}>
              {copy.continue}
            </button>
            <button
              className="button"
              type="button"
              onClick={() => {
                setSkippedCreateKid(true);
                setStep("privacy");
              }}
            >
              {copy.skip}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboardingFlow">
      <div className="onboardingCard">
        <p className="onboardingEyebrow">{copy.before}</p>
        <h1 className="onboardingTitle">{copy.shareTitle}</h1>
        <p className="onboardingBody">{copy.shareBody}</p>
        <p className="onboardingLegal">
          {copy.legal}{" "}
          <a href="/legal/privacy">{copy.privacyPolicy}</a>
          {" · "}
          <a href="/legal/terms">{copy.terms}</a>
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
            {copy.understand}
          </button>
        </div>
      </div>
    </div>
  );
}
