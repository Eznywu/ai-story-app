import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function lengthHint(length: string) {
  if (length === "short") return "about 250-400 words";
  if (length === "medium") return "about 700-900 words";
  return "about 1200-1600 words";
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const { genre, length } = await req.json();

    const client = new OpenAI({ apiKey });

    const prompt = `Write an original ${genre} story, ${lengthHint(length)}.
Make it engaging and easy to listen to.
No headings or bullet points. End with a satisfying last line.`;

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
