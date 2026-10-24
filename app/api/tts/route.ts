import { NextResponse } from "next/server";
import { speakWithOpenAI } from "@/lib/tts/openai";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, voice } = body ?? {};
    const chosenVoice = String(voice || "alloy");
    const buffer = await speakWithOpenAI(String(text ?? ""), chosenVoice);

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "TTS failed") },
      { status: getErrorStatus(err, 500) }
    );
  }
}
