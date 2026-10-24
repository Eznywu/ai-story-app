import OpenAI from "openai";
import { createError } from "@/lib/errors";
import { getOpenAiBaseUrl, getPosterHttpDispatcher } from "@/lib/providerHttp";

export async function speakWithOpenAI(text: string, voice = "alloy") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw createError("Missing OPENAI_API_KEY", 500);
  }
  if (!text?.trim()) {
    throw createError("Missing text", 400);
  }

  const timeoutMs = Math.min(
    Math.max(Number(process.env.OPENAI_TTS_TIMEOUT_MS) || 120_000, 30_000),
    600_000
  );

  const client = new OpenAI({
    apiKey,
    baseURL: getOpenAiBaseUrl(),
    timeout: timeoutMs,
    maxRetries: 0,
    fetchOptions: { dispatcher: getPosterHttpDispatcher(timeoutMs) },
  });
  const audio = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
  });
  return Buffer.from(await audio.arrayBuffer());
}
