import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import {
  compareProviderOutputs,
  finalizeGeminiImagePrompt,
  finalizeOpenAiImagePrompt,
  planPosters,
} from "./creativeDirector.js";
import {
  creativeModel,
  geminiImagenModel,
  geminiNativeModel,
  geminiPosterBackend,
  loadGeminiKey,
  loadOpenAiKey,
  openaiPosterModel,
  openaiPosterQuality,
  openaiPosterSize,
} from "./config.js";
import { generateGeminiPosterPng } from "./geminiPoster.js";
import { generateOpenAiPosterPng } from "./openaiPoster.js";
import { writeRunBundle, type RunMetadata } from "./io.js";

function runIdNow(): string {
  return `${new Date().toISOString().replace(/[:.]/g, "-")}_${crypto.randomBytes(4).toString("hex")}`;
}

export async function runPosterPipeline(params: {
  title: string;
  story: string;
  outDir: string;
  storyPath?: string;
}): Promise<{ runDir: string; meta: RunMetadata }> {
  const storyNorm = params.story.replace(/\r\n/g, "\n").trim();
  if (storyNorm.length < 40) {
    throw new Error("Story is too short — provide at least a few sentences.");
  }

  const openai = new OpenAI({ apiKey: loadOpenAiKey() });
  const gemini = new GoogleGenAI({ apiKey: loadGeminiKey() });

  console.log("\n—— Step 1/4 · Creative director (structured brief + prompts) ——");
  console.log(`Model: ${creativeModel}`);
  const plan = await planPosters({
    client: openai,
    title: params.title.trim() || "Untitled",
    story: storyNorm,
  });
  console.log("Brief OK · variations:", plan.posterPromptVariations.length);

  const promptOpenAI = finalizeOpenAiImagePrompt(plan, params.title.trim() || "Untitled");
  const promptGemini = finalizeGeminiImagePrompt(plan, params.title.trim() || "Untitled");

  console.log("\n—— Step 2/4 · OpenAI poster (GPT Image) ——");
  console.log(`Model: ${openaiPosterModel} · size: ${openaiPosterSize} · quality: ${openaiPosterQuality}`);
  let openaiPng: Buffer | null = null;
  let openaiErr: string | undefined;
  try {
    const { png, revisedNote } = await generateOpenAiPosterPng(openai, promptOpenAI);
    openaiPng = png;
    if (revisedNote) console.log("Note: API revised prompt (DALL·E legacy only) —", revisedNote.slice(0, 120));
    console.log(`OpenAI PNG bytes: ${png.length}`);
  } catch (e: unknown) {
    openaiErr = e instanceof Error ? e.message : String(e);
    console.error("OpenAI image failed:", openaiErr);
  }

  console.log("\n—— Step 3/4 · Gemini poster ——");
  const gBackend = geminiPosterBackend === "imagen" ? "imagen" : "native";
  console.log(`Backend: ${gBackend} · model: ${gBackend === "imagen" ? geminiImagenModel : geminiNativeModel}`);
  let geminiPng: Buffer | null = null;
  let geminiErr: string | undefined;
  try {
    const { png, backend, detail } = await generateGeminiPosterPng(gemini, promptGemini);
    geminiPng = png;
    console.log(`Gemini PNG bytes: ${png.length} (${backend}: ${detail})`);
  } catch (e: unknown) {
    geminiErr = e instanceof Error ? e.message : String(e);
    console.error("Gemini image failed:", geminiErr);
  }

  console.log("\n—— Step 4/4 · Provider comparison (prompt-level) ——");
  const providerComparison = await compareProviderOutputs({
    client: openai,
    plan,
    openaiPrompt: promptOpenAI,
    geminiPrompt: promptGemini,
  });
  console.log(providerComparison.slice(0, 500) + (providerComparison.length > 500 ? "…" : ""));

  const runId = runIdNow();
  const runDir = path.join(params.outDir, runId);
  await fs.mkdir(runDir, { recursive: true });

  if (openaiPng) {
    await fs.writeFile(path.join(runDir, "poster-openai.png"), openaiPng);
  }
  if (geminiPng) {
    await fs.writeFile(path.join(runDir, "poster-gemini.png"), geminiPng);
  }

  const meta: RunMetadata = {
    runId,
    createdAt: new Date().toISOString(),
    title: params.title.trim() || "Untitled",
    storyPath: params.storyPath,
    models: {
      creative: creativeModel,
      openaiImage: openaiPosterModel,
      openaiImageSize: openaiPosterSize,
      geminiBackend: gBackend,
      geminiImageModel: gBackend === "imagen" ? geminiImagenModel : geminiNativeModel,
    },
    outputs: {
      storyNormalized: storyNorm,
      creativeBrief: plan.creativeBrief,
      visualConceptStatement: plan.visualConceptStatement,
      posterPromptVariations: [...plan.posterPromptVariations],
      promptOpenAI,
      promptGemini,
      files: {
        posterOpenAI: "poster-openai.png",
        posterGemini: "poster-gemini.png",
      },
    },
    errors: {
      ...(openaiErr ? { openai: openaiErr } : {}),
      ...(geminiErr ? { gemini: geminiErr } : {}),
    },
    providerComparison,
  };

  await writeRunBundle(runDir, meta, storyNorm);

  console.log(`\n✓ Run written to: ${runDir}`);
  return { runDir, meta };
}