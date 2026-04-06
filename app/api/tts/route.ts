import { NextResponse } from "next/server";
import { speakWithOpenAI } from "@/lib/tts/openai";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { canUseTtsForText } from "@/lib/memberGate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text, voice } = await req.json();
    if (!canUseTtsForText(req, String(text ?? ""))) {
      return NextResponse.json(
        {
          error:
            "Listen is limited to the sample story until you sign in and join membership.",
        },
        { status: 403 }
      );
    }
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
