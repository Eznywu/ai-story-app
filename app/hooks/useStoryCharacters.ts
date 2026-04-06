"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoryCharacterProfile } from "@/lib/profilesTypes";
import { loadStoryCharacters, saveStoryCharacters } from "@/lib/localProfilesStorage";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `char-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useStoryCharacters() {
  const [characters, setCharacters] = useState<StoryCharacterProfile[]>([]);

  useEffect(() => {
    setCharacters(loadStoryCharacters());
  }, []);

  const add = useCallback((input: Omit<StoryCharacterProfile, "id">) => {
    const created: StoryCharacterProfile = { ...input, id: newId() };
    setCharacters((prev) => {
      const merged = [...prev, created];
      saveStoryCharacters(merged);
      return merged;
    });
    return created;
  }, []);

  const update = useCallback((id: string, patch: Partial<StoryCharacterProfile>) => {
    setCharacters((prev) => {
      const merged = prev.map((p) => (p.id === id ? { ...p, ...patch, id: p.id } : p));
      saveStoryCharacters(merged);
      return merged;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setCharacters((prev) => {
      const merged = prev.filter((p) => p.id !== id);
      saveStoryCharacters(merged);
      return merged;
    });
  }, []);

  return { characters, add, update, remove };
}
