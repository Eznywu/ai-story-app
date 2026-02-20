// app/api/story/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function lengthHint(length: string) {
  if (length === "short") return "about 250–400 words";
  if (length === "medium") return "about 700–900 words";
  return "about 1200–1600 words";
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    // Safely parse body
    const body = (await req.json().catch(() => ({}))) as any;

    const genre = String(body.genre ?? "Animals");
    const length = String(body.length ?? "short");
    const age = String(body.age ?? "6 months");
    const language = String(body.language ?? "en");
    const mainCharacterName = String(body.mainCharacterName ?? body.mainName ?? "Lulu");
    const title = String(body.title ?? "").trim();

    // Build prompt
    const isZh = language.toLowerCase().includes("zh");
    const prompt = isZh
      ? [
          `請用繁體中文寫一個適合 ${age} 寶寶聽的睡前故事。`,
          `主角名字叫「${mainCharacterName}」。`,
          `故事類型：${genre}。`,
          `長度：${lengthHint(length)}。`,
          title ? `（故事題名參考：「${title}」）` : "",
          `語氣：像真實的睡前說故事的人，溫柔、安撫、慢慢說。`,
          `格式要求：不要用標題或條列；句子短一點；多用重複句式讓寶寶安心；最後一句要很溫柔地收尾。`,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `Write a bedtime story for a ${age} child.`,
          `Main character name: "${mainCharacterName}".`,
          `Genre: ${genre}.`,
          `Length: ${lengthHint(length)}.`,
          title ? `Title idea (optional): "${title}"` : "",
          `Tone: gentle, soothing, like a real bedtime storyteller. Calm pacing.`,
          `Constraints: no headings or bullet points, short sentences, comforting repetition, end with a soft final line.`,
        ]
          .filter(Boolean)
          .join("\n");

    const client = new OpenAI({ apiKey });

    // Use a known-good model name
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return NextResponse.json({ story: response.output_text ?? "" });
  } catch (err: any) {
    // Return clean error message
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}