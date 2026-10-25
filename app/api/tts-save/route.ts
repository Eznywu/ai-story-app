import { NextResponse } from "next/server";
import { speakWithOpenAI } from "@/lib/tts/openai";
import { saveMediaBytes } from "@/lib/media/objectStore";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Literal required: Next.js segment config must be statically analyzable.
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const { text, voice } = await req.json();

    const chosenVoice = String(voice || "alloy").replace(/[^a-z0-9]/gi, "").slice(0, 24) || "alloy";
    const buffer = await speakWithOpenAI(String(text ?? ""), chosenVoice);

    const filename = `tts_${Date.now()}_${chosenVoice}.mp3`;
    const saved = await saveMediaBytes({
      folder: "audio",
      filename,
      body: buffer,
      contentType: "audio/mpeg",
    });

    return NextResponse.json({
      ok: true,
      filename: saved.filename,
      url: saved.url,
      size: buffer.length,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "TTS-save failed") },
      { status: getErrorStatus(err, 500) }
    );
  }
}
