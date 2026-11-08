"use client";

import { useState } from "react";
import type { StoryGenerationInput } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";
import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";

export type StoryGenerationForm = {
  age: string;
  language: string;
  mainCharacterName: string;
  childGender: string;
  genre: string;
  length: string;
  title: string;
  storyInput: string;
  character?: StoryGenerationInput["character"];
};

export function useStoryGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateStory(form: StoryGenerationForm) {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: form.age,
          language: form.language,
          mainCharacterName: form.mainCharacterName,
          childGender: form.childGender,
          genre: form.genre,
          length: form.length,
          title: form.title,
          storyInput: form.storyInput,
          character: form.character,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (redirectIfUnsigned(res.status)) {
        throw new Error(data?.error || "Sign in to continue.");
      }
      if (!res.ok) {
        throw new Error(data?.error || `Story API failed (${res.status})`);
      }
      return {
        text: String(data?.story ?? ""),
        visualBrief: data?.visualBrief ?? null,
      };
    } catch (e: unknown) {
      throw new Error(getErrorMessage(e, "Failed to generate story."));
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    isGenerating,
    generateStory,
  };
}
