import fs from "node:fs/promises";
import path from "node:path";
import { runPosterPipeline } from "./run.js";

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function readStoryFile(filePath: string): Promise<string> {
  const abs = path.resolve(filePath);
  const raw = await fs.readFile(abs, "utf8");
  if (filePath.toLowerCase().endsWith(".md")) {
    return raw.replace(/^---[\s\S]*?---\s*/m, "").trim();
  }
  return raw.trim();
}

async function main() {
  const title = getArg("--title") ?? "Untitled";
  const storyInline = getArg("--story");
  const file = getArg("--file") ?? getArg("-f");
  const outRaw = getArg("--out") ?? "outputs";

  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(`
Story → dual poster generator (OpenAI GPT Image + Gemini native / Imagen)

Usage:
  npm run poster -- --story "..." --title "..."
  npm run poster -- --file ./story.txt --title "..."
  npm run poster -- --file ./story.md --title "..." --out ./outputs

Environment:
  OPENAI_API_KEY, GEMINI_API_KEY (required)
  See .env.example for optional model tuning.
`);
    process.exit(0);
  }

  let story: string;
  if (storyInline) {
    story = storyInline;
  } else if (file) {
    story = await readStoryFile(file);
  } else {
    console.error('Provide --story "..." or --file path/to/story.txt');
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), outRaw);
  await fs.mkdir(outDir, { recursive: true });

  await runPosterPipeline({
    title,
    story,
    outDir,
    storyPath: file ? path.resolve(file) : undefined,
  });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
