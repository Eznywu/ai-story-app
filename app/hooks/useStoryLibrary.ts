"use client";

import { useState } from "react";
import type { StoryDTO } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";
import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";

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
    dailyAutomated: Boolean(raw?.dailyAutomated),
    posterUrl,
    coverUrl:
      raw?.coverUrl != null && String(raw.coverUrl).trim() !== "" ? String(raw.coverUrl) : null,
    illustrationUrl:
      raw?.illustrationUrl != null && String(raw.illustrationUrl).trim() !== ""
        ? String(raw.illustrationUrl)
        : null,
    artworkStatus: raw?.artworkStatus ? String(raw.artworkStatus) : null,
    posterCaption: raw?.posterCaption ? String(raw.posterCaption) : null,
    dedication: raw?.dedication ? String(raw.dedication) : null,
    audioUrl:
      raw?.audioUrl != null && String(raw.audioUrl).trim() !== "" ? String(raw.audioUrl) : null,
    audioVoiceId: raw?.audioVoiceId ? String(raw.audioVoiceId) : null,
    audioLanguage: raw?.audioLanguage ? String(raw.audioLanguage) : null,
    posterSaved: raw?.posterSaved === true,
    posterSavedAt: raw?.posterSavedAt ? String(raw.posterSavedAt) : null,
  };
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
      if (redirectIfUnsigned(res.status)) {
        throw new Error(data?.error || "Sign in to continue.");
      }
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
    id?: string | null;
    characterId?: string | null;
    characterSnapshot?: unknown;
    visualBrief?: unknown;
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
          ...(input.id ? { id: input.id } : {}),
          ...(input.characterId ? { characterId: input.characterId } : {}),
          ...(input.characterSnapshot ? { characterSnapshot: input.characterSnapshot } : {}),
          ...(input.visualBrief ? { visualBrief: input.visualBrief } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (redirectIfUnsigned(res.status)) {
        throw new Error(data?.error || "Sign in to continue.");
      }
      if (!res.ok) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }
      // The caller opens the saved story next; Home reloads the library when it is shown again.
      return data?.story as Record<string, unknown> | undefined;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteStory(storyId: string) {
    const res = await fetch(`/api/stories?id=${encodeURIComponent(storyId)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (redirectIfUnsigned(res.status)) {
      throw new Error(data?.error || "Sign in to continue.");
    }
    if (!res.ok) {
      throw new Error(data?.error || `Delete failed (${res.status})`);
    }
    setLibrary((current) => current.filter((item) => item.id !== storyId));
  }

  return {
    library,
    loadingLibrary,
    libraryError,
    setLibraryError,
    isSaving,
    refreshLibrary,
    saveStory,
    deleteStory,
  };
}
