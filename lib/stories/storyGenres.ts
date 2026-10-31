/** Canonical genres used for rotation, batch generation, and UI. */
export const STORY_GENRES = [
  "Animals",
  "Adventure",
  "Fantasy",
  "Friendship",
  "Nature",
  "Space",
  "Bedtime Classic",
  "Magic",
  "Underwater",
  "Family",
  "Holiday",
  "Fairy Tale",
] as const;

export type StoryGenre = (typeof STORY_GENRES)[number];
