"use client";

import type { StoryCharacterProfile } from "@/lib/profiles/profilesTypes";
import { clearLocalStoryCharacters, loadStoryCharacters } from "@/lib/profiles/localProfilesStorage";
import { useAccountList } from "@/app/hooks/useAccountList";

export function useStoryCharacters() {
  const { items: characters, add, update, remove } = useAccountList<StoryCharacterProfile>({
    endpoint: "/api/characters",
    field: "characters",
    idPrefix: "char",
    loadLegacy: loadStoryCharacters,
    clearLegacy: clearLocalStoryCharacters,
  });
  return { characters, add, update, remove };
}
