/** Saved kid profile for “Create with My Kid” flows. */
export type KidProfile = {
  id: string;
  name: string;
  age: string;
  gender: "boy" | "girl" | "other";
  interests: string[];
  personality?: string;
  readingLevel?: string;
  favoriteThemes?: string;
  bedtimeLength?: string;
};

/** Saved fictional character for “Create with a Story Character” flows. */
export type StoryCharacterProfile = {
  id: string;
  name: string;
  ageRange: string;
  gender: string;
  characterType: string;
  personality: string;
  skills: string;
  themes: string[];
  visualStyle: string;
};

export type ReadingStatsState = {
  /** Calendar key when `storiesReadToday` applies. */
  todayKey: string;
  /** Audio plays counted today. */
  storiesReadToday: number;
  /** Consecutive days with at least one read. */
  streakDays: number;
  /** Calendar key of the last day the user played audio (for streak). */
  lastReadDayKey: string | null;
  /** Last story id for Continue Reading. */
  lastStoryId: string | null;
  lastStoryTitle: string | null;
  /** Optional one-line “draft in progress” for Home. */
  draftSummary: string | null;
};
