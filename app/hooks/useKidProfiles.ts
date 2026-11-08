"use client";

import type { KidProfile } from "@/lib/profiles/profilesTypes";
import { clearLocalKidProfiles, loadKidProfiles } from "@/lib/profiles/localProfilesStorage";
import { useAccountList } from "@/app/hooks/useAccountList";

export function useKidProfiles() {
  const { items: profiles, add, update, remove } = useAccountList<KidProfile>({
    endpoint: "/api/kids",
    field: "kids",
    idPrefix: "kid",
    loadLegacy: loadKidProfiles,
    clearLegacy: clearLocalKidProfiles,
  });
  return { profiles, add, update, remove };
}
