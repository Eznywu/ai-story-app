import type { KidProfile, ReadingStatsState, StoryCharacterProfile } from "@/lib/profilesTypes";

const KIDS_KEY = "emrsy.kidProfiles.v1";
const CHARS_KEY = "emrsy.storyCharacters.v1";
const READS_KEY = "emrsy.readingStats.v1";

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayDiff(a: string, b: string): number | null {
  const da = parseTodayKey(a);
  const db = parseTodayKey(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / (24 * 60 * 60 * 1000));
}

function parseTodayKey(key: string): Date | null {
  const m = /^(\d+)-(\d+)-(\d+)$/.exec(key);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function loadKidProfiles(): KidProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KIDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as KidProfile[]) : [];
  } catch {
    return [];
  }
}

export function saveKidProfiles(profiles: KidProfile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KIDS_KEY, JSON.stringify(profiles));
}

export function loadStoryCharacters(): StoryCharacterProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHARS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoryCharacterProfile[]) : [];
  } catch {
    return [];
  }
}

export function saveStoryCharacters(chars: StoryCharacterProfile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHARS_KEY, JSON.stringify(chars));
}

export function defaultReadingStats(): ReadingStatsState {
  return {
    todayKey: todayKey(),
    storiesReadToday: 0,
    streakDays: 0,
    lastReadDayKey: null,
    lastStoryId: null,
    lastStoryTitle: null,
    draftSummary: null,
  };
}

export function loadReadingStats(): ReadingStatsState {
  if (typeof window === "undefined") return defaultReadingStats();
  try {
    const raw = localStorage.getItem(READS_KEY);
    if (!raw) return defaultReadingStats();
    const o = JSON.parse(raw) as Partial<ReadingStatsState>;
    return {
      ...defaultReadingStats(),
      ...o,
      todayKey: typeof o.todayKey === "string" ? o.todayKey : todayKey(),
    };
  } catch {
    return defaultReadingStats();
  }
}

/** Resets daily read count when the calendar day changes. */
export function hydrateReadingStats(): ReadingStatsState {
  const tk = todayKey();
  let s = loadReadingStats();
  if (s.todayKey !== tk) {
    s = { ...s, todayKey: tk, storiesReadToday: 0 };
    saveReadingStats(s);
  }
  return s;
}

export function saveReadingStats(s: ReadingStatsState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(READS_KEY, JSON.stringify(s));
}

/** Call when user plays audio for a story. */
export function recordStoryRead(storyId: string, title: string): ReadingStatsState {
  const tk = todayKey();
  let s = loadReadingStats();

  if (s.todayKey !== tk) {
    s = { ...s, todayKey: tk, storiesReadToday: 0 };
  }

  s.storiesReadToday += 1;
  s.lastStoryId = storyId;
  s.lastStoryTitle = title.trim() || null;

  const prev = s.lastReadDayKey;
  if (!prev) {
    s.streakDays = 1;
  } else if (prev === tk) {
    /* more plays same day — streak unchanged */
  } else {
    const diff = dayDiff(prev, tk);
    if (diff === 1) s.streakDays += 1;
    else s.streakDays = 1;
  }
  s.lastReadDayKey = tk;

  saveReadingStats(s);
  return s;
}

export function setDraftSummary(summary: string | null): void {
  const s = loadReadingStats();
  saveReadingStats({ ...s, draftSummary: summary && summary.trim() ? summary.trim() : null });
}
