import OpenAI from "openai";
import { createError } from "@/lib/errors";

export async function speakWithOpenAI(text: string, voice = "alloy") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw createError("Missing OPENAI_API_KEY", 500);
  }
  if (!text?.trim()) {
    throw createError("Missing text", 400);
  }

  const client = new OpenAI({ apiKey });
  const audio = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
  });
  return Buffer.from(await audio.arrayBuffer());
}
