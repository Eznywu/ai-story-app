"use client";

import { useCallback } from "react";
import type { ReadingStatsState } from "@/lib/profiles/profilesTypes";
import {
  applyStoryRead,
  clearLocalReadingStats,
  defaultReadingStats,
  peekStoredReadingStats,
  todayKey,
} from "@/lib/profiles/localProfilesStorage";
import { useAccountRecord } from "@/app/hooks/useAccountRecord";

function forToday(stats: ReadingStatsState): ReadingStatsState {
  const tk = todayKey();
  if (stats.todayKey === tk) return stats;
  return { ...stats, todayKey: tk, storiesReadToday: 0 };
}

function fromServer(server: unknown): { value: ReadingStatsState; save: boolean } {
  const saved = server && typeof server === "object" ? (server as ReadingStatsState) : null;
  if (saved) {
    const today = forToday(saved);
    return { value: today, save: today !== saved };
  }
  const legacy = peekStoredReadingStats();
  return legacy ? { value: forToday(legacy), save: true } : { value: defaultReadingStats(), save: false };
}

export function useReadingStats() {
  const { value: stats, edit } = useAccountRecord<ReadingStatsState | null>({
    endpoint: "/api/reading-stats",
    field: "readingStats",
    label: "reading-stats",
    initial: null,
    fromServer,
    afterSync: clearLocalReadingStats,
  });

  const onStoryPlayed = useCallback(
    (storyId: string, title: string) => {
      edit((current) => applyStoryRead(current ?? defaultReadingStats(), storyId, title));
    },
    [edit]
  );

  const setDraftSummary = useCallback(
    (line: string | null) => {
      const draftSummary = line && line.trim() ? line.trim() : null;
      edit((current) => {
        const base = current ?? defaultReadingStats();
        return base.draftSummary === draftSummary ? base : { ...base, draftSummary };
      });
    },
    [edit]
  );

  return { stats, onStoryPlayed, setDraftSummary };
}
