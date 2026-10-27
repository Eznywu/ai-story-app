// app/api/eleven-tts/route.ts
import { NextResponse } from "next/server";
import fs from "fs/promises";
import { narrateWithEleven, resolveNarrationVoice } from "@/lib/tts/eleven";
import { getPronunciationDictionary } from "@/lib/tts/dictionaryFile";
import { planNarration } from "@/lib/tts/planNarration";
import { saveStoryAudioFile } from "@/lib/audio/storyMediaFiles";
import { recordNarrationAssets, recordNarrationFailure } from "@/lib/audio/narrationMeta";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { prisma } from "@/lib/prisma";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { findOwnedStory } from "@/lib/auth/ownedStory";
import { requireUser } from "@/lib/auth/requireUser";
import { isCloneVoiceId, VOICE_CLONE_PREFIX } from "@/lib/voices/voices";
import { isRemoteMediaUrl, localMediaPath } from "@/lib/media/objectStore";
import { clampTtsSpeed } from "@/lib/tts/ttsLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Literal required: Next.js segment config must be statically analyzable.
export const maxDuration = 300;

function audioHeaders(extra?: Record<string, string | number | null | undefined>) {
  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Cache-Control": "no-store",
  });
  if (!extra) return headers;
  for (const [key, value] of Object.entries(extra)) {
    if (value == null || value === "") continue;
    headers.set(key, String(value));
  }
  return headers;
}

async function readSavedAudio(filename: string | null, url: string | null): Promise<Buffer | null> {
  if (filename) {
    const filePath = localMediaPath("audio", filename);
    if (filePath) {
      try {
        return await fs.readFile(filePath);
      } catch {
        /* The file may live in Blob instead. */
      }
    }
  }
  if (url && isRemoteMediaUrl(url)) {
    const response = await fetch(url);
    if (response.ok) return Buffer.from(await response.arrayBuffer());
  }
  return null;
}

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
        return NextResponse.json({ error: "That voice is not on this account." }, { status: 403 });
      }
    }

    const storyId = typeof body?.storyId === "string" ? body.storyId.trim() : "";
    let story: { audioFilename: string | null; audioUrl: string | null; audioCacheKey: string | null } | null = null;
    if (storyId) {
      if (!isSafeStoryId(storyId)) {
        return NextResponse.json({ error: "That story id is not valid." }, { status: 400 });
      }
      const owned = await findOwnedStory(auth.user.id, storyId);
      if (!owned) {
        return NextResponse.json({ error: "Story not found." }, { status: 404 });
      }
      story = owned;
    }

    const storyText = String(body?.text ?? "");
    if (!storyText.trim()) {
      return NextResponse.json({ error: "Add story text before making narration." }, { status: 400 });
    }
    const language = typeof body?.language === "string" && body.language.trim() ? body.language.trim() : "zh-Hant";
    const speed = clampTtsSpeed(Number(body?.speed ?? NaN));
    const voice = resolveNarrationVoice(requestedVoiceId || undefined, language);
    const dictionary = getPronunciationDictionary();
    const plan = planNarration({
      text: storyText,
      language,
      voiceId: voice.appVoiceId,
      dictionary,
      speed,
    });
    const force = body?.force === true;
    const identityHeaders = {
      "X-Audio-Cache-Key": plan.cacheKey,
      "X-Audio-Config-Version": plan.configVersion,
      "X-Audio-Dictionary-Version": plan.dictionaryVersion,
      "X-Audio-Model": plan.modelId,
      "X-Audio-Voice-Id": plan.voiceId,
      "X-Audio-Speed": plan.voiceSettings.speed ?? "",
      "X-Audio-Config-Id": plan.configId,
    };

    if (!force && story?.audioCacheKey && story.audioCacheKey === plan.cacheKey) {
      const existing = await readSavedAudio(story.audioFilename, story.audioUrl);
      if (existing?.length) {
        const headers = audioHeaders({
          ...identityHeaders,
          "X-Audio-Url": story.audioUrl,
          "X-Audio-Reused": "1",
        });
        return new NextResponse(new Uint8Array(existing), { headers });
      }
    }

    const result = await narrateWithEleven({
      text: storyText,
      speed,
      language,
      voiceId: requestedVoiceId || undefined,
      hadPreviousAudio: Boolean(story?.audioFilename || story?.audioUrl),
    });

    if (!result.ok) {
      if (storyId) {
        await recordNarrationFailure({
          storyId,
          message: result.message,
          cacheKey: result.plan.cacheKey,
        }).catch((err: unknown) => {
          console.error("[/api/eleven-tts] failure log failed", getErrorMessage(err, "log failed"));
        });
      }
      return NextResponse.json({ error: result.message, keptPreviousAudio: result.keptPrevious }, { status: 502 });
    }

    const headers = audioHeaders({
      ...identityHeaders,
      "X-Audio-Cache-Key": result.plan.cacheKey,
      "X-Audio-Transcript": result.transcriptStatus,
    });

    if (storyId) {
      try {
        const savedUrl = await saveStoryAudioFile(storyId, result.audio, {
          modelId: result.plan.modelId,
          voiceId: result.plan.voiceId,
          voiceSettings: result.plan.voiceSettings as Record<string, string | number | boolean | null>,
          language: result.plan.language,
          dictionaryVersion: result.plan.dictionaryVersion,
          configVersion: result.plan.configVersion,
          configId: result.plan.configId,
          cacheKey: result.plan.cacheKey,
        });
        headers.set("X-Audio-Url", savedUrl);
        await recordNarrationAssets({
          storyId,
          plan: result.plan,
          url: savedUrl,
          attempts: result.attempts,
          validityStatus: result.validity.status,
          validityNotes: result.validity.notes,
          transcriptStatus: result.transcriptStatus,
          transcriptNotes: result.transcriptNotes,
          durationMs: result.validity.durationMs,
        }).catch((err: unknown) => {
          console.error("[/api/eleven-tts] review row failed", getErrorMessage(err, "review row failed"));
        });
      } catch (err: unknown) {
        console.error("[/api/eleven-tts] save failed", getErrorMessage(err, "save failed"));
        headers.set("X-Audio-Save-Error", "Narration could not be saved on the story.");
      }
    }

    return new NextResponse(new Uint8Array(result.audio), { headers });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(e, "Voice failed, try again.") },
      { status: getErrorStatus(e, 500) }
    );
  }
}
