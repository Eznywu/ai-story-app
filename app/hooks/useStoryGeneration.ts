"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";

export type StoryGenerationForm = {
  age: string;
  language: string;
  mainCharacterName: string;
  childGender: string;
  genre: string;
  length: string;
  title: string;
  storyInput: string;
};

export function useStoryGeneration() {
  const [story, setStory] = useState("");
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Story API failed (${res.status})`);
      }
      const nextStory = String(data?.story ?? "");
      setStory(nextStory);
      return nextStory;
    } catch (e: unknown) {
      throw new Error(getErrorMessage(e, "Failed to generate story."));
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    story,
    setStory,
    isGenerating,
    generateStory,
  };
}
