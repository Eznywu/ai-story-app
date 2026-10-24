// app/api/eleven-tts/route.ts
import { NextResponse } from "next/server";
import { speakWithEleven } from "@/lib/tts/eleven";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const audioBuffer = await speakWithEleven({
      text: body?.text,
      speed: body?.speed,
      emotion: body?.emotion,
      language: body?.language,
      voiceId: body?.voiceId,
    });

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(e, "Unknown error") },
      { status: getErrorStatus(e, 500) }
    );
  }
}