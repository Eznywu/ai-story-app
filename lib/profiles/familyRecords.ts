import type { KidProfile, ReadingStatsState, StoryCharacterProfile } from "@/lib/profiles/profilesTypes";
import { isSafeStoryId } from "@/lib/stories/storyIds";

const MAX_KIDS = 24;
const MAX_CHARACTERS = 40;
const MAX_INTERESTS = 12;
const ID_RE = /^[a-zA-Z0-9_-]{8,80}$/;

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").trim().slice(0, max);
}

function optionalClip(value: unknown, max: number): string | null {
  const text = clip(value, max);
  return text ? text : null;
}

function stringList(value: unknown, itemMax: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = clip(item, itemMax);
    if (!text || out.includes(text)) continue;
    out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

function requireId(value: unknown, label: string): string {
  const id = clip(value, 80);
  if (!ID_RE.test(id)) {
    throw new Error(`Each ${label} needs a valid id.`);
  }
  return id;
}

export function parseKidProfiles(value: unknown): KidProfile[] {
  if (!Array.isArray(value)) {
    throw new Error("Kid profiles must be a list.");
  }
  if (value.length > MAX_KIDS) {
    throw new Error(`You can save up to ${MAX_KIDS} kid profiles.`);
  }
  const seen = new Set<string>();
  return value.map((row) => {
    if (!row || typeof row !== "object") throw new Error("A kid profile was not valid.");
    const item = row as Record<string, unknown>;
    const id = requireId(item.id, "kid profile");
    if (seen.has(id)) throw new Error("Two kid profiles used the same id.");
    seen.add(id);
    const name = clip(item.name, 80);
    if (!name) throw new Error("Each kid profile needs a name.");
    const gender = clip(item.gender, 20);
    if (gender !== "boy" && gender !== "girl" && gender !== "other") {
      throw new Error("Choose boy, girl, or other for each kid profile.");
    }
    return {
      id,
      name,
      age: clip(item.age, 40),
      gender,
      interests: stringList(item.interests, 40, MAX_INTERESTS),
      personality: optionalClip(item.personality, 200) ?? undefined,
      readingLevel: optionalClip(item.readingLevel, 80) ?? undefined,
      favoriteThemes: optionalClip(item.favoriteThemes, 200) ?? undefined,
      bedtimeLength: optionalClip(item.bedtimeLength, 40) ?? undefined,
    };
  });
}

export function parseStoryCharacters(value: unknown): StoryCharacterProfile[] {
  if (!Array.isArray(value)) {
    throw new Error("Story characters must be a list.");
  }
  if (value.length > MAX_CHARACTERS) {
    throw new Error(`You can save up to ${MAX_CHARACTERS} story characters.`);
  }
  const seen = new Set<string>();
  return value.map((row) => {
    if (!row || typeof row !== "object") throw new Error("A story character was not valid.");
    const item = row as Record<string, unknown>;
    const id = requireId(item.id, "story character");
    if (seen.has(id)) throw new Error("Two story characters used the same id.");
    seen.add(id);
    const name = clip(item.name, 80);
    if (!name) throw new Error("Each story character needs a name.");
    return {
      id,
      name,
      ageRange: clip(item.ageRange, 40),
      gender: clip(item.gender, 40),
      characterType: clip(item.characterType, 80),
      personality: clip(item.personality, 200),
      skills: clip(item.skills, 200),
      themes: stringList(item.themes, 40, MAX_INTERESTS),
      visualStyle: clip(item.visualStyle, 200),
    };
  });
}

function clampCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(10_000, Math.floor(n));
}

export function parseReadingStats(value: unknown): ReadingStatsState {
  if (!value || typeof value !== "object") {
    throw new Error("Reading stats were not valid.");
  }
  const item = value as Record<string, unknown>;
  const todayKey = clip(item.todayKey, 20);
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(todayKey)) {
    throw new Error("Reading stats need a valid day.");
  }
  const lastReadDayKey = optionalClip(item.lastReadDayKey, 20);
  if (lastReadDayKey && !/^\d{4}-\d{1,2}-\d{1,2}$/.test(lastReadDayKey)) {
    throw new Error("Reading stats need a valid day.");
  }
  const lastStoryId = optionalClip(item.lastStoryId, 64);
  if (lastStoryId && !isSafeStoryId(lastStoryId)) {
    throw new Error("That story id is not valid.");
  }
  return {
    todayKey,
    storiesReadToday: clampCount(item.storiesReadToday),
    streakDays: clampCount(item.streakDays),
    lastReadDayKey,
    lastStoryId,
    lastStoryTitle: optionalClip(item.lastStoryTitle, 120),
    draftSummary: optionalClip(item.draftSummary, 200),
  };
}

export function kidToJson(row: {
  id: string;
  name: string;
  age: string;
  gender: string;
  interests: string[];
  personality: string | null;
  readingLevel: string | null;
  favoriteThemes: string | null;
  bedtimeLength: string | null;
}): KidProfile {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender === "boy" || row.gender === "girl" ? row.gender : "other",
    interests: row.interests,
    personality: row.personality ?? undefined,
    readingLevel: row.readingLevel ?? undefined,
    favoriteThemes: row.favoriteThemes ?? undefined,
    bedtimeLength: row.bedtimeLength ?? undefined,
  };
}

export function characterToJson(row: {
  id: string;
  name: string;
  ageRange: string;
  gender: string;
  characterType: string;
  personality: string;
  skills: string;
  themes: string[];
  visualStyle: string;
}): StoryCharacterProfile {
  return {
    id: row.id,
    name: row.name,
    ageRange: row.ageRange,
    gender: row.gender,
    characterType: row.characterType,
    personality: row.personality,
    skills: row.skills,
    themes: row.themes,
    visualStyle: row.visualStyle,
  };
}
