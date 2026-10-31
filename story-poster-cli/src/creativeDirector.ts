import OpenAI from "openai";
import { creativeModel } from "./config.js";
import { SHARED_POSTER_CONSTRAINTS } from "./promptKit.js";

const POSTER_PLAN_JSON_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: [
      "creativeBrief",
      "visualConceptStatement",
      "themes",
      "emotionalCore",
      "centralConflict",
      "protagonistEnergy",
      "worldbuildingCues",
      "symbolicMotifs",
      "posterPromptVariations",
      "finalImagePromptOpenAI",
      "finalImagePromptGemini",
    ],
    properties: {
      creativeBrief: {
        type: "string",
        description: "Short creative brief (5–8 sentences): emotional core, stakes, why this poster matters.",
      },
      visualConceptStatement: {
        type: "string",
        description: "One tight paragraph: the single illustrated moment, focal subject, and visual metaphor.",
      },
      themes: { type: "array", items: { type: "string" } },
      emotionalCore: { type: "string" },
      centralConflict: { type: "string" },
      protagonistEnergy: { type: "string" },
      worldbuildingCues: { type: "array", items: { type: "string" } },
      symbolicMotifs: { type: "array", items: { type: "string" } },
      posterPromptVariations: {
        type: "array",
        description: "Exactly three distinct poster prompt directions (each usable as image prompt seed).",
        items: { type: "string" },
      },
      finalImagePromptOpenAI: {
        type: "string",
        description:
          "Single best full image prompt optimized for OpenAI GPT Image: concrete scene, lighting, lens feel, palette, materials, composition; premium illustrated look.",
      },
      finalImagePromptGemini: {
        type: "string",
        description:
          "Single best full image prompt optimized for Gemini native image / Imagen: same story beat, phrasing tuned for strong illustrated output.",
      },
    },
} as const;

export type PosterPlan = {
  creativeBrief: string;
  visualConceptStatement: string;
  themes: string[];
  emotionalCore: string;
  centralConflict: string;
  protagonistEnergy: string;
  worldbuildingCues: string[];
  symbolicMotifs: string[];
  posterPromptVariations: [string, string, string];
  finalImagePromptOpenAI: string;
  finalImagePromptGemini: string;
};

function buildDirectorSystemMessage(title: string): string {
  return `You are a senior key-art illustrator and creative director for narrative posters — comparable to festival one-sheets, animated feature teasers, and prestige book covers.

Read the user's story carefully. Identify: emotional core, central conflict (or tension), protagonist energy, world-building cues, and 2–4 symbolic motifs that could unify the image.

Think visually: one iconic, readable moment — not a literal summary of every plot beat. Favor metaphor, silhouette, and lighting story over busy literalism.

The story title for this poster is: "${title.replace(/"/g, '\\"')}".

Output valid JSON only, matching the provided schema. The three posterPromptVariations must be meaningfully different (e.g. alternate metaphor, scale shift, or emotional register).

finalImagePromptOpenAI and finalImagePromptGemini must each be a single cohesive English image-generation prompt (no bullets). They may differ slightly in phrasing for model strengths but must depict the same creative decision.

Do not include URLs or markdown.`;
}

export async function planPosters(params: {
  client: OpenAI;
  title: string;
  story: string;
}): Promise<PosterPlan> {
  const user = `Story text:\n"""${params.story}"""`;

  const res = await params.client.chat.completions.create({
    model: creativeModel,
    temperature: 0.88,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "story_poster_plan",
        strict: true,
        schema: POSTER_PLAN_JSON_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: buildDirectorSystemMessage(params.title) },
      { role: "user", content: user },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("Creative director returned empty content.");

  let parsed: PosterPlan;
  try {
    parsed = JSON.parse(raw) as PosterPlan;
  } catch {
    throw new Error("Creative director returned non-JSON.");
  }

  if (
    !Array.isArray(parsed.posterPromptVariations) ||
    parsed.posterPromptVariations.length !== 3
  ) {
    throw new Error("Creative director must return exactly 3 posterPromptVariations.");
  }
  parsed.posterPromptVariations = parsed.posterPromptVariations as [string, string, string];

  return parsed;
}

export function finalizeOpenAiImagePrompt(plan: PosterPlan, title: string): string {
  return [
    `Illustrated vertical narrative poster. Title (for context only, do not crowd with tiny text): "${title}".`,
    plan.finalImagePromptOpenAI.trim(),
    SHARED_POSTER_CONSTRAINTS,
  ].join("\n\n");
}

export function finalizeGeminiImagePrompt(plan: PosterPlan, title: string): string {
  return [
    `Illustrated vertical narrative poster. Title (for context only, avoid illegible small type): "${title}".`,
    plan.finalImagePromptGemini.trim(),
    SHARED_POSTER_CONSTRAINTS,
  ].join("\n\n");
}

export async function compareProviderOutputs(params: {
  client: OpenAI;
  plan: PosterPlan;
  openaiPrompt: string;
  geminiPrompt: string;
}): Promise<string> {
  const res = await params.client.chat.completions.create({
    model: creativeModel,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content:
          "You compare two illustration pipelines (OpenAI GPT Image vs Gemini/Imagen-class) based on prompts and creative intent only — you cannot see pixels. Give 2 short paragraphs: (1) what each prompt likely emphasizes, (2) what to watch for when reviewing the saved PNGs. Be practical, not hype. No markdown headings.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            visualConcept: params.plan.visualConceptStatement,
            openaiPrompt: params.openaiPrompt.slice(0, 6000),
            geminiPrompt: params.geminiPrompt.slice(0, 6000),
          },
          null,
          2
        ),
      },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
