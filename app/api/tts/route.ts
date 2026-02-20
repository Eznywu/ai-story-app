import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const { text, voice } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const chosenVoice = voice || "alloy";
    const client = new OpenAI({ apiKey });

    const audio = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: chosenVoice,
      input: text,
    });

    const arrayBuffer = await audio.arrayBuffer();

    return new Response(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "TTS failed" },
      { status: 500 }
    );
  }
}
