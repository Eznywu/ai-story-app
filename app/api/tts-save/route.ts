import OpenAI from "openai";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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
    const buffer = Buffer.from(arrayBuffer);

    const dir = path.join(process.cwd(), "uploads", "audio");
    await fs.mkdir(dir, { recursive: true });

    const filename = `tts_${Date.now()}_${chosenVoice}.mp3`;
    const filePath = path.join(dir, filename);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      filename,
      url: `/api/audio/${filename}`,
      size: buffer.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "TTS-save failed" }, { status: 500 });
  }
}
