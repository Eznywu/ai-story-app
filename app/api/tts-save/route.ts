import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
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
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "TTS-save failed") },
      { status: getErrorStatus(err, 500) }
    );
  }
}
