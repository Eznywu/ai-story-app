"use client";

import { useState } from "react";
import type { StoryDTO } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";

export type StoryLibraryItem = StoryDTO & {
  story: string;
};

function toLibraryItem(raw: Record<string, unknown>): StoryLibraryItem {
  const posterUrl =
    raw?.posterUrl != null && String(raw.posterUrl).trim() !== ""
      ? String(raw.posterUrl)
      : null;
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    genre: String(raw?.genre ?? ""),
    length: String(raw?.length ?? ""),
    text: String(raw?.text ?? raw?.story ?? ""),
    story: String(raw?.text ?? raw?.story ?? ""),
    age: raw?.age ? String(raw.age) : null,
    language: raw?.language ? String(raw.language) : null,
    mainCharacterName: raw?.mainCharacterName ? String(raw.mainCharacterName) : null,
    childGender: raw?.childGender ? String(raw.childGender) : null,
    createdAt: String(raw?.createdAt ?? ""),
    posterUrl,
  };
}

async function blobToBase64Png(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = r.result as string;
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.onerror = () => reject(new Error("Could not read poster image."));
    r.readAsDataURL(blob);
  });
}

export function useStoryLibrary() {
  const [library, setLibrary] = useState<StoryLibraryItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function refreshLibrary(): Promise<boolean> {
    setLoadingLibrary(true);
    setLibraryError("");
    try {
      const res = await fetch("/api/stories", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Could not load library (${res.status})`);
      }
      const items: unknown[] = Array.isArray(data?.stories) ? data.stories : [];
      setLibrary(
        items.map((item: unknown) =>
          toLibraryItem((item as Record<string, unknown>) ?? {})
        )
      );
      return true;
    } catch (e: unknown) {
      setLibraryError(getErrorMessage(e, "Could not load saved stories."));
      return false;
    } finally {
      setLoadingLibrary(false);
    }
  }

  async function saveStory(input: {
    age: string;
    language: string;
    mainCharacterName: string;
    childGender: string;
    genre: string;
    length: string;
    title: string;
    story: string;
  }) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: input.age,
          language: input.language,
          mainCharacterName: input.mainCharacterName,
          childGender: input.childGender,
          genre: input.genre,
          length: input.length,
          title: input.title,
          text: input.story,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }
      await refreshLibrary();
      return data?.story as Record<string, unknown> | undefined;
    } finally {
      setIsSaving(false);
    }
  }

  async function savePosterForStory(storyId: string, blob: Blob) {
    const imageBase64 = await blobToBase64Png(blob);
    const res = await fetch("/api/posters/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId, imageBase64 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Poster save failed (${res.status})`);
    }
    await refreshLibrary();
    return { posterUrl: String(data?.posterUrl ?? "") };
  }

  return {
    library,
    loadingLibrary,
    libraryError,
    setLibraryError,
    isSaving,
    refreshLibrary,
    saveStory,
    savePosterForStory,
  };
}
