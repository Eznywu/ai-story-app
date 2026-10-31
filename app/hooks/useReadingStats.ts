"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReadingStatsState } from "@/lib/profiles/profilesTypes";
import {
  applyStoryRead,
  clearLocalReadingStats,
  defaultReadingStats,
  peekStoredReadingStats,
  todayKey,
} from "@/lib/profiles/localProfilesStorage";
import { clientJson } from "@/lib/auth/clientApi";

function forToday(stats: ReadingStatsState): ReadingStatsState {
  const tk = todayKey();
  if (stats.todayKey === tk) return stats;
  return { ...stats, todayKey: tk, storiesReadToday: 0 };
}

async function putStats(readingStats: ReadingStatsState) {
  await clientJson("/api/reading-stats", {
    method: "PUT",
    body: JSON.stringify({ readingStats }),
  });
}

export function useReadingStats() {
  const [stats, setStats] = useState<ReadingStatsState | null>(null);
  const statsRef = useRef<ReadingStatsState | null>(null);
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());

  const replace = useCallback((next: ReadingStatsState) => {
    statsRef.current = next;
    setStats(next);
  }, []);

  useEffect(() => {
    const seen = revision.current;
    let cancelled = false;
    queue.current = queue.current
      .then(async () => {
        const data = await clientJson<{ readingStats: ReadingStatsState | null }>("/api/reading-stats");
        if (cancelled || revision.current !== seen) return;
        const local = peekStoredReadingStats();
        let next = data.readingStats ? forToday(data.readingStats) : null;
        if (!data.readingStats && local) {
          next = forToday(local);
          await putStats(next);
          clearLocalReadingStats();
        } else if (local) {
          clearLocalReadingStats();
        }
        if (!cancelled && revision.current === seen) {
          const resolved = next ?? defaultReadingStats();
          replace(resolved);
          if (data.readingStats && resolved.todayKey !== data.readingStats.todayKey) {
            await putStats(resolved);
          }
        }
      })
      .catch((error: unknown) => {
        console.error("[reading-stats] load failed", error);
        if (!cancelled && !statsRef.current) replace(defaultReadingStats());
      });
    return () => {
      cancelled = true;
    };
  }, [replace]);

  const refresh = useCallback(() => {
    const seen = revision.current;
    queue.current = queue.current
      .then(async () => {
        const data = await clientJson<{ readingStats: ReadingStatsState | null }>("/api/reading-stats");
        if (revision.current !== seen) return;
        replace(data.readingStats ? forToday(data.readingStats) : defaultReadingStats());
      })
      .catch((error: unknown) => {
        console.error("[reading-stats] refresh failed", error);
      });
  }, [replace]);

  const onStoryPlayed = useCallback(
    (storyId: string, title: string) => {
      revision.current += 1;
      const next = applyStoryRead(statsRef.current ?? defaultReadingStats(), storyId, title);
      replace(next);
      queue.current = queue.current
        .then(() => putStats(next))
        .catch((error: unknown) => {
          console.error("[reading-stats] save failed", error);
        });
    },
    [replace]
  );

  const setDraftSummary = useCallback(
    (line: string | null) => {
      revision.current += 1;
      const base = statsRef.current ?? defaultReadingStats();
      const next = { ...base, draftSummary: line && line.trim() ? line.trim() : null };
      replace(next);
      queue.current = queue.current
        .then(() => putStats(next))
        .catch((error: unknown) => {
          console.error("[reading-stats] save failed", error);
        });
    },
    [replace]
  );

  return { stats, refresh, onStoryPlayed, setDraftSummary };
}
