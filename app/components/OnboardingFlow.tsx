"use client";

import React, { useState } from "react";
import type { OnboardingIntent } from "@/lib/profiles/localProfilesStorage";
import { AppStateCard } from "@/app/components/AppStateCard";

type Step = "welcome" | "privacy" | "create_kid" | "intent" | "permissions";

type CreateKidPayload = {
  name: string;
  age: string;
  interests: string[];
};

type Props = {
  onFinish: (result: { skippedCreateKid: boolean; intent: OnboardingIntent | null }) => void;
  onCreateKid: (payload: CreateKidPayload) => void;
};

const INTERESTS = ["Animals", "Adventure", "Fantasy", "Friendship", "Magic", "Nature", "Space", "Bedtime"];

export function OnboardingFlow({ onFinish, onCreateKid }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [age, setAge] = useState("5");
  const [interests, setInterests] = useState<string[]>([]);
  const [skippedCreateKid, setSkippedCreateKid] = useState(false);
  const [intent, setIntent] = useState<OnboardingIntent | null>(null);

  function toggleInterest(next: string) {
    setInterests((prev) => (prev.includes(next) ? prev.filter((x) => x !== next) : [...prev, next]));
  }

  if (step === "welcome") {
    return (
      <div className="onboardingFlow">
        <div className="onboardingCard">
          <p className="onboardingEyebrow">Welcome to Emrsy Story</p>
          <h1 className="onboardingTitle">Personalized bedtime stories for your child, in minutes.</h1>
          <p className="onboardingBody">
            Create warm stories with your child&apos;s name, favorite themes, and voices that feel comforting at bedtime.
          </p>
          <button className="button buttonPrimary onboardingPrimary" type="button" onClick={() => setStep("privacy")}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === "privacy") {
    return (
      <div className="onboardingFlow">
        <div className="onboardingCard">
          <p className="onboardingEyebrow">Privacy and trust</p>
          <h1 className="onboardingTitle">You stay in control of voice and microphone access.</h1>
          <p className="onboardingBody">
            We ask permission only when needed for voice recording and playback features. You can continue without sharing a
            personal voice.
          </p>
          <p className="onboardingLegal">
            By continuing, you agree to our <a href="/legal/privacy">Privacy Policy</a> and <a href="/legal/terms">Terms</a>.
          </p>
          <button className="button buttonPrimary onboardingPrimary" type="button" onClick={() => setStep("create_kid")}>
            I understand
          </button>
        </div>
      </div>
    );
  }

  if (step === "create_kid") {
    return (
      <div className="onboardingFlow">
        <div className="onboardingCard">
          <p className="onboardingEyebrow">Create Kid</p>
          <h1 className="onboardingTitle">Let&apos;s make the first story feel personal.</h1>
          <div className="fieldGrid">
            <label className="field">
              <span className="label">Kid name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lulu" />
            </label>
            <label className="field">
              <span className="label">Age</span>
              <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 5" />
            </label>
            <div className="field">
              <span className="label">Interests (optional)</span>
              <div className="profileModal__tags">
                {INTERESTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`profileModal__tag${interests.includes(item) ? " profileModal__tag--on" : ""}`}
                    onClick={() => toggleInterest(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="onboardingActions">
            <button
              className="button buttonPrimary"
              type="button"
              disabled={!name.trim()}
              onClick={() => {
                onCreateKid({ name: name.trim(), age: age.trim() || "5", interests });
                setSkippedCreateKid(false);
                setStep("permissions");
              }}
            >
              Create kid profile
            </button>
            <button
              className="button"
              type="button"
              onClick={() => {
                setSkippedCreateKid(true);
                setStep("intent");
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "intent") {
    const options: { id: OnboardingIntent; label: string }[] = [
      { id: "create_story", label: "Create a bedtime story" },
      { id: "build_kid_profile", label: "Build a kid profile" },
      { id: "create_character", label: "Create a story character" },
      { id: "continue_reading", label: "Continue reading" },
      { id: "explore_library", label: "Explore the library" },
    ];
    return (
      <div className="onboardingFlow">
        <div className="onboardingCard">
          <p className="onboardingEyebrow">What brings you here?</p>
          <h1 className="onboardingTitle">We&apos;ll guide your first step.</h1>
          <div className="onboardingOptionList">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`onboardingOption${intent === option.id ? " onboardingOption--active" : ""}`}
                onClick={() => setIntent(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button className="button buttonPrimary onboardingPrimary" type="button" onClick={() => setStep("permissions")}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboardingFlow">
      <div className="onboardingCard">
        <AppStateCard
          tone="permission"
          title="Permissions, only when helpful"
          body="We will ask for microphone access only when you record a personal voice. You can always choose Maybe later."
        />
        <div className="onboardingActions">
          <button
            className="button buttonPrimary"
            type="button"
            onClick={() => onFinish({ skippedCreateKid, intent })}
          >
            Enter Home
          </button>
        </div>
      </div>
    </div>
  );
}
