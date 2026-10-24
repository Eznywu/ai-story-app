"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReadingStatsState } from "@/lib/profiles/profilesTypes";
import {
  hydrateReadingStats,
  recordStoryRead as persistRead,
  setDraftSummary as persistDraft,
} from "@/lib/profiles/localProfilesStorage";

export function useReadingStats() {
  const [stats, setStats] = useState<ReadingStatsState | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setStats(hydrateReadingStats());
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const refresh = useCallback(() => {
    setStats(hydrateReadingStats());
  }, []);

  const onStoryPlayed = useCallback((storyId: string, title: string) => {
    const next = persistRead(storyId, title);
    setStats(next);
  }, []);

  const setDraftSummary = useCallback((line: string | null) => {
    persistDraft(line);
    setStats(hydrateReadingStats());
  }, []);

  return { stats, refresh, onStoryPlayed, setDraftSummary };
}
