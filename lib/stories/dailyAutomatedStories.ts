import { prisma } from "@/lib/prisma";
import { generateStoryWithRetry } from "@/lib/stories/storyGenerator";
import { STORY_GENRES } from "@/lib/stories/storyGenres";
import type { StoryGenerationInput } from "@/lib/types";

const CHARACTER_NAMES = [
  "Lulu",
  "Milo",
  "Nora",
  "Kai",
  "Sofi",
  "Owen",
  "Iris",
  "Leo",
  "Maya",
  "Ezra",
];

type SlotPreset = StoryGenerationInput & { saveTitle: string };

function utcDayIndex(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

/** Two generation payloads for this UTC day (deterministic; rotates genres and names). */
export function dailyStoryPresetsForDate(d: Date): [SlotPreset, SlotPreset] {
  const day = utcDayIndex(d);
  const name0 = CHARACTER_NAMES[day % CHARACTER_NAMES.length];
  const name1 = CHARACTER_NAMES[(day + 5) % CHARACTER_NAMES.length];
  const g0 = STORY_GENRES[day % STORY_GENRES.length];
  const g1 = STORY_GENRES[(day + 5) % STORY_GENRES.length];
  const label = d.toISOString().slice(0, 10);

  const base0: StoryGenerationInput = {
    genre: g0,
    length: "short",
    age: "3 years",
    language: "en",
    mainCharacterName: name0,
    childGender: "any",
    title: `A quiet night drift (${g0})`,
  };
  const base1: StoryGenerationInput = {
    genre: g1,
    length: "short",
    age: "18 months",
    language: "en",
    mainCharacterName: name1,
    childGender: "any",
    title: `Soft rhythm (${g1})`,
  };

  return [
    {
      ...base0,
      saveTitle: `New · ${g0} — ${label}`,
    },
    {
      ...base1,
      saveTitle: `New · ${g1} — ${label}`,
    },
  ];
}

export type DailyStoryJobResult = {
  created: { id: string; title: string }[];
  errors: { slot: number; message: string }[];
};

/**
 * Generates and persists two stories with `dailyAutomated: true`.
 * Home "New Release" lists only these rows (newest first).
 */
export async function runDailyAutomatedStories(now = new Date()): Promise<DailyStoryJobResult> {
  const presets = dailyStoryPresetsForDate(now);
  const created: { id: string; title: string }[] = [];
  const errors: { slot: number; message: string }[] = [];

  for (let slot = 0; slot < presets.length; slot++) {
    const p = presets[slot];
    const { saveTitle, ...genInput } = p;
    try {
      const text = await generateStoryWithRetry(genInput, { retries: 2 });
      const trimmed = text.trim();
      if (!trimmed) {
        errors.push({ slot, message: "Empty model output" });
        continue;
      }
      const row = await prisma.story.create({
        data: {
          title: saveTitle,
          genre: String(genInput.genre ?? "Animals"),
          length: String(genInput.length ?? "short"),
          text: trimmed,
          age: genInput.age ? String(genInput.age) : null,
          language: genInput.language ? String(genInput.language) : null,
          mainCharacterName: genInput.mainCharacterName
            ? String(genInput.mainCharacterName)
            : null,
          childGender: genInput.childGender ? String(genInput.childGender) : null,
          dailyAutomated: true,
        },
      });
      created.push({ id: row.id, title: row.title });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ slot, message });
    }
  }

  return { created, errors };
}
