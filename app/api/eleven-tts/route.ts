// app/api/eleven-tts/route.ts
import { NextResponse } from "next/server";
import { speakWithEleven } from "@/lib/tts/eleven";
import { saveStoryAudioFile } from "@/lib/audio/storyMediaFiles";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { prisma } from "@/lib/prisma";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const audioBuffer = await speakWithEleven({
      text: body?.text,
      speed: body?.speed,
      emotion: body?.emotion,
      language: body?.language,
      voiceId: body?.voiceId,
    });

    if (!audioBuffer.length) {
      return NextResponse.json({ error: "Narration came back empty. Try again." }, { status: 502 });
    }

    const headers = new Headers({
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    });

    const storyId = typeof body?.storyId === "string" ? body.storyId.trim() : "";
    if (storyId) {
      if (!isSafeStoryId(storyId)) {
        headers.set("X-Audio-Save-Error", "Story id was not valid, so narration was not saved.");
      } else {
        try {
          const exists = await prisma.story.findUnique({
            where: { id: storyId },
            select: { id: true },
          });
          if (!exists) {
            headers.set("X-Audio-Save-Error", "Story was not found, so narration was not saved.");
          } else {
            const savedUrl = await saveStoryAudioFile(storyId, audioBuffer);
            headers.set("X-Audio-Url", savedUrl);
          }
        } catch (err: unknown) {
          console.error("[/api/eleven-tts] save failed", getErrorMessage(err, "save failed"));
          headers.set("X-Audio-Save-Error", "Narration could not be saved on the story.");
        }
      }
    }

    return new NextResponse(new Uint8Array(audioBuffer), { headers });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(e, "Voice failed, try again.") },
      { status: getErrorStatus(e, 500) }
    );
  }
}
