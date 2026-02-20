// app/api/story/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AgeGroup = "3m" | "6m" | "9m" | "1y" | "2y";
type Lang = "en" | "zh";

function ageGuidance(age: AgeGroup) {
  switch (age) {
    case "3m":
      return {
        level:
          "Ultra-simple, soothing rhythm. 2–4 very short lines. Lots of repetition. Mostly sounds and gentle words.",
        length: "about 40–80 words",
      };
    case "6m":
      return {
        level:
          "Very simple. 4–6 short lines. Repetition, gentle sensory words. No complex plot.",
        length: "about 80–140 words",
      };
    case "9m":
      return {
        level:
          "Simple mini-story. 6–10 short lines. Clear cause/effect. Repetition. Friendly sounds.",
        length: "about 140–220 words",
      };
    case "1y":
      return {
        level:
          "Simple story with a tiny beginning–middle–end. Short sentences. Repetition. Everyday objects and actions.",
        length: "about 220–350 words",
      };
    case "2y":
      return {
        level:
          "Toddler story. Short sentences, clear plot, gentle humor. Encourage interaction (questions like “Can you clap?”) but keep it brief.",
        length: "about 350–550 words",
      };
  }
}

function languageInstruction(lang: Lang) {
  if (lang === "zh") {
    return {
      label: "Traditional Chinese",
      instruction:
        "Write in Traditional Chinese. Use warm, simple words suitable for very young children. Avoid rare characters.",
    };
  }
  return {
    label: "English",
    instruction:
      "Write in simple, warm English suitable for very young children.",
  };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const genre = String(body.genre ?? "Fantasy");
    const length = String(body.length ?? "short"); // keep your existing length dropdown
    const age = (body.age as AgeGroup) ?? "1y";
    const language = (body.language as Lang) ?? "en";
    const mainCharacter = String(body.mainCharacter ?? "Momo").trim() || "Momo";

    const ageInfo = ageGuidance(age);
    const langInfo = languageInstruction(language);

    // Keep your existing genre/length idea, but now we add age/language/character constraints.
    const prompt = `
You are writing a bedtime audiobook story for a child.

Language requirement:
- ${langInfo.instruction}

Inputs:
- Genre: ${genre}
- UI length setting: ${length}
- Target age: ${age} (writing guidance: ${ageInfo.level})
- Main character name: ${mainCharacter}

Hard rules:
- Make "${mainCharacter}" the main character and mention the name naturally throughout.
- Keep it appropriate for the target age.
- Use the guidance above for sentence complexity and tone.
- Story length: ${ageInfo.length} (approx).
- No headings, no bullet points, no numbered lists.
- End with a calm, satisfying final line.

Write the story now.
`.trim();

    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-5.2",
      input: prompt,
    });

    return NextResponse.json({ story: response.output_text });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
