import fs from "node:fs/promises";
import path from "node:path";

export type RunMetadata = {
  runId: string;
  createdAt: string;
  title: string;
  storyPath?: string;
  models: {
    creative: string;
    openaiImage: string;
    openaiImageSize: string;
    geminiBackend: string;
    geminiImageModel: string;
  };
  outputs: {
    storyNormalized: string;
    creativeBrief: string;
    visualConceptStatement: string;
    posterPromptVariations: string[];
    promptOpenAI: string;
    promptGemini: string;
    files: {
      posterOpenAI: string;
      posterGemini: string;
    };
  };
  errors?: { openai?: string; gemini?: string };
  providerComparison: string;
};

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeRunBundle(root: string, meta: RunMetadata, storyText: string): Promise<void> {
  await ensureDir(root);

  await fs.writeFile(path.join(root, "story.txt"), storyText, "utf8");

  await fs.writeFile(
    path.join(root, "creative-brief.md"),
    [
      `# Creative brief`,
      ``,
      meta.outputs.creativeBrief,
      ``,
      `## Visual concept`,
      ``,
      meta.outputs.visualConceptStatement,
      ``,
    ].join("\n"),
    "utf8"
  );

  await fs.writeFile(
    path.join(root, "prompts.json"),
    JSON.stringify(
      {
        posterPromptVariations: meta.outputs.posterPromptVariations,
        finalImagePromptOpenAI: meta.outputs.promptOpenAI,
        finalImagePromptGemini: meta.outputs.promptGemini,
      },
      null,
      2
    ),
    "utf8"
  );

  await fs.writeFile(path.join(root, "comparison.md"), meta.providerComparison, "utf8");

  await fs.writeFile(path.join(root, "metadata.json"), JSON.stringify(meta, null, 2), "utf8");
}
