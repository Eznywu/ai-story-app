/** Labels sent to story generation (must stay compatible with `normalizeStoryInput`). */
export const STORY_AGE_OPTIONS = ["3 months", "6 months", "9 months", "1 year", "2 years"] as const;

export type StoryAgeLabel = (typeof STORY_AGE_OPTIONS)[number];

export function storyAgeIndex(age: string): number {
  const i = STORY_AGE_OPTIONS.indexOf(age as StoryAgeLabel);
  return i >= 0 ? i : 1;
}
