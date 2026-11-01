import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { accountCanOwnVoices, findOwnedVoice, listOwnedVoices } from "@/lib/voices/accountVoices";
import { authorizeSynthesis } from "@/lib/voices/decisions";
import { normalizeAppLanguage } from "@/lib/voices/language";
import { planVoicePreview, type PreviewPlan } from "@/lib/voices/previewPlan";
import { mockNarrationMp3Buffer } from "@/lib/providers/mockProviders";
import { prisma } from "@/lib/prisma";
import { readPrivateMedia, saveMediaBytes } from "@/lib/media/objectStore";
import { defaultNarratorById } from "@/lib/voices/registry";
import { buildElevenSpeechRequest } from "@/lib/tts/elevenRequest";
import { speakWithElevenRequest } from "@/lib/tts/eleven";
import { resolveTtsModelId } from "@/lib/tts/modelCapabilities";
import { activeTtsConfig, settingsForSelectedModel } from "@/lib/tts/config";
import { getModelCapability } from "@/lib/tts/modelCapabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function audioResponse(bytes: Uint8Array | Buffer, source: string, cache: string) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, no-store",
      "X-Preview-Source": source,
      "X-Preview-Cache": cache,
    },
  });
}

function cacheKeyOf(plan: PreviewPlan): string | null {
  if (plan.action === "forbidden") return null;
  return plan.cacheKey;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const url = new URL(req.url);
  const requestedId = (url.searchParams.get("voiceId") || "").trim();
  const language = normalizeAppLanguage(url.searchParams.get("language"));
  const canOwn = accountCanOwnVoices(auth.user.email);
  const owned = canOwn ? await listOwnedVoices(auth.user.id) : [];
  const decision = authorizeSynthesis({ requesterId: auth.user.id, requestedId, language, owned });
  if (!decision.ok) {
    return NextResponse.json({ error: decision.error, alternatives: decision.alternatives }, { status: decision.status });
  }
  if (decision.kind === "legacy" || !decision.allowSynthesis) {
    return NextResponse.json(
      { error: decision.ok ? decision.warning || "That voice cannot be previewed." : "That voice cannot be previewed." },
      { status: 409 }
    );
  }
  const personal = decision.kind === "personal" ? await findOwnedVoice(auth.user.id, decision.appVoiceId) : null;
  if (decision.kind === "personal" && (!personal || personal.status !== "ready" || personal.requiresVerification)) {
    return NextResponse.json({ error: "That voice is not ready to preview." }, { status: 409 });
  }
  const narrator = decision.kind === "default" ? defaultNarratorById(decision.appVoiceId) : null;
  const base = {
    voiceAppId: decision.appVoiceId,
    language,
    ownerId: decision.ownerId,
    voiceVersion: personal?.voiceVersion ?? 1,
    providerVoiceId: personal?.providerVoiceId ?? narrator?.providerVoiceId ?? null,
    kind: decision.kind === "personal" ? ("personal" as const) : ("default" as const),
    selectable: true,
    narrator,
  };
  const plan = planVoicePreview({ ...base, cached: false });
  const cacheKey = cacheKeyOf(plan);
  const existing = cacheKey
    ? await prisma.narrationPreview.findUnique({ where: { cacheKey } }).catch(() => null)
    : null;
  // Only real provider clips are reused. A missing file falls through to a fresh plan, never to the mock clip.
  if (existing?.source === "generated") {
    const bytes = await readPrivateMedia({ folder: "voices", filename: existing.filename, storageUrl: existing.storageUrl });
    if (bytes) return audioResponse(bytes, existing.source, "hit");
  }
  if (plan.action === "forbidden") return NextResponse.json({ error: plan.error }, { status: plan.status });
  if (plan.action === "library") return NextResponse.redirect(plan.url, 302);
  if (plan.action === "generate") {
    const modelId = resolveTtsModelId();
    const capability = getModelCapability(modelId);
    const settings = settingsForSelectedModel(capability, language, undefined, activeTtsConfig().id);
    const request = buildElevenSpeechRequest({ text: plan.script, modelId, language, voiceSettings: settings });
    const audio = await speakWithElevenRequest(plan.providerVoiceId, request);
    await rememberPreview(plan.cacheKey, decision.appVoiceId, decision.ownerId, language, modelId, personal?.voiceVersion ?? 1, audio);
    return audioResponse(audio, "generated", "miss");
  }
  return audioResponse(mockNarrationMp3Buffer(), "mock", "miss");
}

/** Caches a paid preview so replay does not call the provider again. Not cached if the file could not be saved. */
async function rememberPreview(
  cacheKey: string,
  voiceAppId: string,
  ownerUserId: string | null,
  language: string,
  modelId: string,
  voiceVersion: number,
  audio: Buffer
) {
  try {
    const saved = await saveMediaBytes({
      folder: "voices",
      filename: `voice_preview_${cacheKey.slice(0, 24)}.mp3`,
      body: audio,
      contentType: "audio/mpeg",
      access: "private",
    });
    const stored = {
      source: "generated",
      filename: saved.filename,
      storageUrl: saved.url.startsWith("http") ? saved.url : null,
    };
    await prisma.narrationPreview.upsert({
      where: { cacheKey },
      create: { cacheKey, voiceAppId, ownerUserId, language, modelId, voiceVersion, ...stored },
      update: stored,
    });
  } catch (error) {
    console.warn("[voice-preview] preview not cached", error instanceof Error ? error.message : error);
  }
}
