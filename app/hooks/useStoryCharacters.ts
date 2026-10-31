"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoryCharacterProfile } from "@/lib/profiles/profilesTypes";
import { clearLocalStoryCharacters, loadStoryCharacters } from "@/lib/profiles/localProfilesStorage";
import { clientJson } from "@/lib/auth/clientApi";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `char-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function putCharacters(characters: StoryCharacterProfile[]) {
  await clientJson("/api/characters", {
    method: "PUT",
    body: JSON.stringify({ characters }),
  });
}

export function useStoryCharacters() {
  const [characters, setCharacters] = useState<StoryCharacterProfile[]>([]);
  const charactersRef = useRef<StoryCharacterProfile[]>([]);
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());

  const replace = useCallback((next: StoryCharacterProfile[]) => {
    charactersRef.current = next;
    setCharacters(next);
  }, []);

  useEffect(() => {
    const seen = revision.current;
    let cancelled = false;
    queue.current = queue.current
      .then(async () => {
        const data = await clientJson<{ characters?: StoryCharacterProfile[] }>("/api/characters");
        if (cancelled || revision.current !== seen) return;
        const server = Array.isArray(data.characters) ? data.characters : [];
        const local = loadStoryCharacters();
        let next = server;
        if (server.length === 0 && local.length > 0) {
          await putCharacters(local);
          clearLocalStoryCharacters();
          next = local;
        } else if (local.length > 0) {
          clearLocalStoryCharacters();
        }
        if (!cancelled && revision.current === seen) replace(next);
      })
      .catch((error: unknown) => {
        console.error("[characters] load failed", error);
      });
    return () => {
      cancelled = true;
    };
  }, [replace]);

  const persist = useCallback((next: StoryCharacterProfile[]) => {
    queue.current = queue.current
      .then(() => putCharacters(next))
      .catch((error: unknown) => {
        console.error("[characters] save failed", error);
      });
  }, []);

  const add = useCallback(
    (input: Omit<StoryCharacterProfile, "id">) => {
      const created: StoryCharacterProfile = { ...input, id: newId() };
      revision.current += 1;
      const merged = [...charactersRef.current, created];
      replace(merged);
      persist(merged);
      return created;
    },
    [persist, replace]
  );

  const update = useCallback(
    (id: string, patch: Partial<StoryCharacterProfile>) => {
      revision.current += 1;
      const merged = charactersRef.current.map((character) =>
        character.id === id ? { ...character, ...patch, id: character.id } : character
      );
      replace(merged);
      persist(merged);
    },
    [persist, replace]
  );

  const remove = useCallback(
    (id: string) => {
      revision.current += 1;
      const merged = charactersRef.current.filter((character) => character.id !== id);
      replace(merged);
      persist(merged);
    },
    [persist, replace]
  );

  return { characters, add, update, remove };
}
