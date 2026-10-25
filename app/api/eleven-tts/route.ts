// app/api/eleven-tts/route.ts
import { NextResponse } from "next/server";
import { speakWithEleven } from "@/lib/tts/eleven";
import { saveStoryAudioFile } from "@/lib/audio/storyMediaFiles";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { prisma } from "@/lib/prisma";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { findOwnedStory } from "@/lib/auth/ownedStory";
import { requireUser } from "@/lib/auth/requireUser";
import { isCloneVoiceId, VOICE_CLONE_PREFIX } from "@/lib/voices/voices";
import { VERCEL_FUNCTION_MAX_SECONDS } from "@/lib/vercelDuration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = VERCEL_FUNCTION_MAX_SECONDS;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const requestedVoiceId = typeof body?.voiceId === "string" ? body.voiceId.trim() : "";
    if (requestedVoiceId && isCloneVoiceId(requestedVoiceId)) {
      const elevenId = requestedVoiceId.slice(VOICE_CLONE_PREFIX.length).trim();
      const ownedVoice = elevenId
        ? await prisma.voice.findFirst({
            where: { userId: auth.user.id, voiceId: elevenId },
            select: { id: true },
          })
        : null;
      if (!ownedVoice) {
        return NextResponse.json(
          { error: "That voice is not on this account." },
          { status: 403 }
        );
      }
    }

    const storyId = typeof body?.storyId === "string" ? body.storyId.trim() : "";
    if (storyId) {
      if (!isSafeStoryId(storyId)) {
        return NextResponse.json({ error: "That story id is not valid." }, { status: 400 });
      }
      const owned = await findOwnedStory(auth.user.id, storyId);
      if (!owned) {
        return NextResponse.json({ error: "Story not found." }, { status: 404 });
      }
    }
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

    if (storyId) {
      try {
        const savedUrl = await saveStoryAudioFile(storyId, audioBuffer);
        headers.set("X-Audio-Url", savedUrl);
      } catch (err: unknown) {
        console.error("[/api/eleven-tts] save failed", getErrorMessage(err, "save failed"));
        headers.set("X-Audio-Save-Error", "Narration could not be saved on the story.");
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
