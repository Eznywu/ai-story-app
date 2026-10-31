/**
 * Writes markdown stories under content/story-library/<genre-slug>/:
 * - standalone/01–05: five one-off bedtime shorts per genre
 * - series/01–02: two three-part series per genre (connected via storyInput)
 *
 * Usage:
 *   STORY_LIBRARY_ANTIREPEAT=0 npx tsx scripts/generate-story-library.ts
 *   npx tsx scripts/generate-story-library.ts --genre Animals
 *
 * Requires OPENAI_API_KEY (and optional .env.local via dotenv below).
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { STORY_GENRES } from "@/lib/stories/storyGenres";
import { generateStoryWithRetry } from "@/lib/stories/storyGenerator";

loadEnv();
loadEnv({ path: path.join(process.cwd(), ".env.local"), override: true });

process.env.STORY_LIBRARY_ANTIREPEAT ??= "0";

const ROOT = path.join(process.cwd(), "content", "story-library");

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

const STANDALONE_COUNT = 5;
const SERIES_COUNT = 2;
const PARTS_PER_SERIES = 3;

function genreSlug(genre: string): string {
  return genre.toLowerCase().replace(/\s+/g, "-");
}

function pickName(seed: number): string {
  return CHARACTER_NAMES[Math.abs(seed) % CHARACTER_NAMES.length];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mdFile(body: {
  genre: string;
  kind: "standalone" | "series";
  seriesId?: string;
  part?: number;
  title: string;
  mainCharacterName: string;
  age: string;
  text: string;
}): string {
  const meta = [
    "---",
    `genre: ${JSON.stringify(body.genre)}`,
    `kind: ${body.kind}`,
    body.seriesId ? `seriesId: ${JSON.stringify(body.seriesId)}` : "",
    body.part != null ? `part: ${body.part}` : "",
    `title: ${JSON.stringify(body.title)}`,
    `mainCharacterName: ${JSON.stringify(body.mainCharacterName)}`,
    `age: ${JSON.stringify(body.age)}`,
    `generatedAt: ${JSON.stringify(new Date().toISOString())}`,
    "---",
    "",
    body.text.trim(),
    "",
  ]
    .filter(Boolean)
    .join("\n");
  return meta;
}

function parseGenreFlag(argv: string[]): string | null {
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--genre=")) return a.slice("--genre=".length).trim() || null;
    if (a === "--genre") return (argv[i + 1] ?? "").trim() || null;
  }
  return null;
}

async function writeStory(relPath: string, contents: string) {
  const full = path.join(ROOT, relPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, contents, "utf8");
}

async function generateStandalone(opts: {
  genre: string;
  index: number;
  genreSeed: number;
}): Promise<void> {
  const n = opts.index + 1;
  const name = pickName(opts.genreSeed * 100 + opts.index);
  const title = `${opts.genre} — standalone ${n}`;
  const text = await generateStoryWithRetry(
    {
      genre: opts.genre,
      length: "short",
      age: "3 years",
      language: "en",
      mainCharacterName: name,
      childGender: "any",
      title,
    },
    { retries: 2 }
  );
  const slug = genreSlug(opts.genre);
  const file = mdFile({
    genre: opts.genre,
    kind: "standalone",
    title,
    mainCharacterName: name,
    age: "3 years",
    text,
  });
  await writeStory(path.join(slug, "standalone", `${String(n).padStart(2, "0")}.md`), file);
}

async function generateSeries(opts: {
  genre: string;
  seriesNum: 1 | 2;
  genreSeed: number;
}): Promise<void> {
  const slug = genreSlug(opts.genre);
  const seriesFolder = opts.seriesNum === 1 ? "01" : "02";
  const name = pickName(opts.genreSeed * 1000 + opts.seriesNum * 17);

  let previous = "";

  for (let part = 1; part <= PARTS_PER_SERIES; part++) {
    const title = `${opts.genre} — series ${opts.seriesNum}, part ${part} of ${PARTS_PER_SERIES}`;
    let storyInput: string;
    if (part === 1) {
      storyInput =
        `This is part 1 of ${PARTS_PER_SERIES} in a gentle bedtime mini-series. Introduce ${name} in a cozy ${opts.genre.toLowerCase()} setting with one small thread that can continue (a tiny goal, a kindly mystery, or a friend to meet). End at a soft pause—not the final goodbye—so parts 2–3 can continue naturally.`;
    } else {
      const tail = previous.replace(/\s+/g, " ").trim().slice(-650);
      storyInput =
        `This is part ${part} of ${PARTS_PER_SERIES} of the same bedtime mini-series. Same main character (${name}), same calm tone and world. Do not restart from the beginning; continue seamlessly. The previous part ended near: "${tail}"`;
    }

    const text = await generateStoryWithRetry(
      {
        genre: opts.genre,
        length: "short",
        age: "3 years",
        language: "en",
        mainCharacterName: name,
        childGender: "any",
        title,
        storyInput,
      },
      { retries: 2 }
    );
    previous = text.trim();

    const file = mdFile({
      genre: opts.genre,
      kind: "series",
      seriesId: seriesFolder,
      part,
      title,
      mainCharacterName: name,
      age: "3 years",
      text: previous,
    });

    await writeStory(
      path.join(slug, "series", seriesFolder, `part-${String(part).padStart(2, "0")}.md`),
      file
    );

    await sleep(800);
  }
}

async function main() {
  const genreFilter = parseGenreFlag(process.argv);
  const genres = genreFilter
    ? STORY_GENRES.filter((g) => g.toLowerCase() === genreFilter.toLowerCase())
    : [...STORY_GENRES];

  if (genres.length === 0) {
    console.error(`Unknown genre "${genreFilter}". Valid: ${STORY_GENRES.join(", ")}`);
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("Missing OPENAI_API_KEY.");
    process.exit(1);
  }

  await mkdir(ROOT, { recursive: true });

  for (const genre of genres) {
    const seed = Math.max(
      0,
      STORY_GENRES.indexOf(genre as (typeof STORY_GENRES)[number])
    );

    console.error(`Genre: ${genre}`);

    for (let i = 0; i < STANDALONE_COUNT; i++) {
      await generateStandalone({ genre, index: i, genreSeed: seed });
      console.error(`  standalone ${i + 1}/${STANDALONE_COUNT}`);
      await sleep(800);
    }

    for (const seriesNum of [1, 2] as const) {
      await generateSeries({ genre, seriesNum, genreSeed: seed });
      console.error(`  series ${seriesNum}/${SERIES_COUNT} (parts 1–${PARTS_PER_SERIES})`);
    }
  }

  console.error(`Done. Files under ${ROOT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
