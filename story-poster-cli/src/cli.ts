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
Story poster prompt comparison. This does not look at pictures and is not visual QA.

By default it writes the prompts only. It does not call an image provider.
Set POSTER_BENCHMARK=1 to also call OpenAI and Gemini. That mode is for local
development, spends money, and is still a prompt comparison rather than visual QA.

Usage:
  npm run poster -- --story "..." --title "..."
  npm run poster -- --file ./story.txt --title "..." --out ./outputs
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
