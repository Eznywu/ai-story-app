"use client";

import { useCallback, useEffect, useState } from "react";
import type { KidProfile } from "@/lib/profilesTypes";
import { loadKidProfiles, saveKidProfiles } from "@/lib/localProfilesStorage";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `kid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useKidProfiles() {
  const [profiles, setProfiles] = useState<KidProfile[]>([]);

  useEffect(() => {
    setProfiles(loadKidProfiles());
  }, []);

  const add = useCallback((input: Omit<KidProfile, "id">) => {
    const created: KidProfile = { ...input, id: newId() };
    setProfiles((prev) => {
      const merged = [...prev, created];
      saveKidProfiles(merged);
      return merged;
    });
    return created;
  }, []);

  const update = useCallback((id: string, patch: Partial<KidProfile>) => {
    setProfiles((prev) => {
      const merged = prev.map((p) => (p.id === id ? { ...p, ...patch, id: p.id } : p));
      saveKidProfiles(merged);
      return merged;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setProfiles((prev) => {
      const merged = prev.filter((p) => p.id !== id);
      saveKidProfiles(merged);
      return merged;
    });
  }, []);

  return { profiles, add, update, remove };
}
