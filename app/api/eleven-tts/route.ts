import { NextResponse } from "next/server";
import { narrateWithEleven } from "@/lib/tts/eleven";
import { getPronunciationDictionary } from "@/lib/tts/dictionaryFile";
import { planNarration } from "@/lib/tts/planNarration";
import { saveStoryAudioFile } from "@/lib/audio/storyMediaFiles";
import { recordNarrationAssets, recordNarrationFailure } from "@/lib/audio/narrationMeta";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { findOwnedStory } from "@/lib/auth/ownedStory";
import { requireUser } from "@/lib/auth/requireUser";
import { authorizeSynthesis } from "@/lib/voices/decisions";
import { accountCanOwnVoices, findOwnedVoice, listOwnedVoices } from "@/lib/voices/accountVoices";
import { isRemoteMediaUrl, readPrivateMedia } from "@/lib/media/objectStore";
import { clampTtsSpeed } from "@/lib/tts/ttsLimits";
import { STORY_TEXT_MAX_CHARS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Literal required: Next.js segment config must be statically analyzable.
export const maxDuration = 300;

type HeaderValues = Record<string, string | number | null | undefined>;

type NarrationOutcome =
  | { ok: true; audio: Buffer; headers: HeaderValues }
  | { ok: false; status: number; body: Record<string, unknown> };

/**
 * Identical requests that arrive while one is still running (double taps, autoplay plus a tap)
 * share that one paid provider call instead of starting another.
 */
const inflightNarrations = new Map<string, Promise<NarrationOutcome>>();

function audioHeaders(values: HeaderValues) {
  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Cache-Control": "no-store",
  });
  for (const [key, value] of Object.entries(values)) {
    if (value == null || value === "") continue;
    headers.set(key, String(value));
  }
  return headers;
}

async function readSavedAudio(story: {
  audioFilename: string | null;
  audioUrl: string | null;
  audioStorageUrl: string | null;
}): Promise<Buffer | null> {
  const stored = await readPrivateMedia({
    folder: "audio",
    filename: story.audioFilename,
    storageUrl: story.audioStorageUrl,
  });
  if (stored?.length) return stored;
  if (story.audioUrl && isRemoteMediaUrl(story.audioUrl)) {
    const response = await fetch(story.audioUrl);
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
    const language = typeof body?.language === "string" && body.language.trim() ? body.language.trim() : "zh-Hant";
    const canOwn = accountCanOwnVoices(auth.user.email);
    const owned = canOwn ? await listOwnedVoices(auth.user.id) : [];
    const decision = authorizeSynthesis({
      requesterId: auth.user.id,
      requestedId: requestedVoiceId,
      language,
      owned,
    });
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error, alternatives: decision.alternatives }, { status: decision.status });
    }
    const personal = decision.kind === "personal" ? await findOwnedVoice(auth.user.id, decision.appVoiceId) : null;
    if (decision.kind === "personal" && !personal) {
      return NextResponse.json({ error: "That voice is not on this account." }, { status: 404 });
    }

    const storyId = typeof body?.storyId === "string" ? body.storyId.trim() : "";
    if (storyId && !isSafeStoryId(storyId)) {
      return NextResponse.json({ error: "That story id is not valid." }, { status: 400 });
    }
    const story = storyId ? await findOwnedStory(auth.user.id, storyId) : null;
    if (storyId && !story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    // A saved story is narrated from its saved text, so the recording always matches what is stored.
    const storyText = story ? story.text : String(body?.text ?? "");
    if (!storyText.trim()) {
      return NextResponse.json({ error: "Add story text before making narration." }, { status: 400 });
    }
    if (storyText.length > STORY_TEXT_MAX_CHARS) {
      return NextResponse.json({ error: "This story is too long to narrate in one recording." }, { status: 400 });
    }
    const speed = clampTtsSpeed(Number(body?.speed ?? NaN));
    const voiceVersion = personal?.voiceVersion ?? decision.voiceVersion;
    const plan = planNarration({
      text: storyText,
      language,
      voiceId: decision.appVoiceId,
      dictionary: getPronunciationDictionary(),
      speed,
      ownerId: decision.ownerId,
      voiceVersion,
      voiceKind: decision.voiceKind,
    });
    const identityHeaders = {
      "X-Audio-Cache-Key": plan.cacheKey,
      "X-Audio-Config-Version": plan.configVersion,
      "X-Audio-Dictionary-Version": plan.dictionaryVersion,
      "X-Audio-Model": plan.modelId,
      "X-Audio-Voice-Id": plan.voiceId,
      "X-Audio-Speed": plan.voiceSettings.speed ?? "",
      "X-Audio-Config-Id": plan.configId,
    };

    if (body?.force !== true && story?.audioCacheKey && story.audioCacheKey === plan.cacheKey) {
      const existing = await readSavedAudio(story);
      if (existing?.length) {
        return new NextResponse(new Uint8Array(existing), {
          headers: audioHeaders({ ...identityHeaders, "X-Audio-Url": story.audioUrl, "X-Audio-Reused": "1" }),
        });
      }
    }

    if (!decision.allowSynthesis) {
      return NextResponse.json(
        { error: decision.warning || "That narrator is no longer offered.", keptPreviousAudio: true, alternatives: decision.alternatives },
        { status: 409 }
      );
    }

    const narrate = async (): Promise<NarrationOutcome> => {
      const result = await narrateWithEleven({
        text: storyText,
        speed,
        language,
        voiceId: decision.appVoiceId,
        providerVoiceId: personal?.providerVoiceId || decision.providerVoiceId,
        ownerId: decision.ownerId,
        voiceVersion,
        voiceKind: decision.voiceKind === "legacy" ? "legacy" : decision.kind,
        hadPreviousAudio: Boolean(story?.audioFilename || story?.audioUrl),
      });

      if (!result.ok) {
        if (story) {
          await recordNarrationFailure({
            storyId: story.id,
            message: result.message,
            cacheKey: result.plan.cacheKey,
          }).catch((err: unknown) => {
            console.error("[/api/eleven-tts] failure log failed", getErrorMessage(err, "log failed"));
          });
        }
        return { ok: false, status: 502, body: { error: result.message, keptPreviousAudio: result.keptPrevious } };
      }

      const headers: HeaderValues = {
        ...identityHeaders,
        "X-Audio-Cache-Key": result.plan.cacheKey,
        "X-Audio-Transcript": result.transcriptStatus,
      };
      if (story) {
        try {
          const savedUrl = await saveStoryAudioFile(story.id, result.audio, {
            modelId: result.plan.modelId,
            voiceId: result.plan.voiceId,
            voiceSettings: result.plan.voiceSettings as Record<string, string | number | boolean | null>,
            language: result.plan.language,
            dictionaryVersion: result.plan.dictionaryVersion,
            configVersion: result.plan.configVersion,
            configId: result.plan.configId,
            cacheKey: result.plan.cacheKey,
            privateAccess: decision.kind === "personal",
            voiceKind: decision.voiceKind,
            voiceVersion,
          });
          headers["X-Audio-Url"] = savedUrl;
          await recordNarrationAssets({
            storyId: story.id,
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
          headers["X-Audio-Save-Error"] = "Narration could not be saved on the story.";
        }
      }
      return { ok: true, audio: result.audio, headers };
    };

    const inflightKey = `${auth.user.id}:${story?.id ?? "-"}:${plan.cacheKey}`;
    let job = inflightNarrations.get(inflightKey);
    if (!job) {
      job = narrate().finally(() => inflightNarrations.delete(inflightKey));
      inflightNarrations.set(inflightKey, job);
    }
    const outcome = await job;
    if (!outcome.ok) return NextResponse.json(outcome.body, { status: outcome.status });
    return new NextResponse(new Uint8Array(outcome.audio), { headers: audioHeaders(outcome.headers) });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(e, "Voice failed, try again.") },
      { status: getErrorStatus(e, 500) }
    );
  }
}
