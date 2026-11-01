import { NextResponse } from "next/server";
import { localTestParentEnabled } from "@/lib/auth/config";
import { requireUser } from "@/lib/auth/requireUser";
import { accountCanOwnVoices, findOwnedVoice, listOwnedVoices } from "@/lib/voices/accountVoices";
import { authorizeSynthesis } from "@/lib/voices/decisions";
import { normalizeAppLanguage } from "@/lib/voices/language";
import { previewSpendAllowed } from "@/lib/voices/limits";
import { planVoicePreview, type PreviewPlan } from "@/lib/voices/previewPlan";
import { checkPreviewAudio, PREVIEW_MAX_BYTES, type ServablePreviewSource } from "@/lib/voices/previewAudio";
import { previewSpendTodayUsd, readCachedPreview, recordPreviewAttempt, rememberPreview } from "@/lib/voices/previewStore";
import { defaultNarratorById, isLibrarySampleUrl } from "@/lib/voices/registry";
import { audioResponse } from "@/lib/audio/audioResponse";
import { buildElevenSpeechRequest } from "@/lib/tts/elevenRequest";
import { speakWithElevenRequest } from "@/lib/tts/eleven";
import { getModelCapability, resolveTtsModelId } from "@/lib/tts/modelCapabilities";
import { activeTtsConfig, settingsForSelectedModel } from "@/lib/tts/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLE_TIMEOUT_MS = 10_000;

type Produced =
  | { ok: true; bytes: Buffer; source: ServablePreviewSource }
  | { ok: false; status: number; reason: string; error: string };

/** Two taps, or two tabs, asking for the same preview share one download or one paid call. */
const inflight = new Map<string, Promise<Produced>>();

const UNAVAILABLE: Record<string, { status: number; error: string }> = {
  live_preview_off: { status: 503, error: "A preview of this voice isn't available right now." },
  no_provider_voice: { status: 503, error: "A preview of this voice isn't available right now." },
  daily_cap_reached: { status: 429, error: "Voice previews have reached today's limit. Try again tomorrow." },
};

function previewError(status: number, reason: string, error: string) {
  return NextResponse.json({ error, reason }, { status, headers: { "Cache-Control": "no-store" } });
}

async function fetchLibrarySample(url: string): Promise<Buffer> {
  if (!isLibrarySampleUrl(url)) throw new Error("That sample address is not a Voice Library address.");
  const response = await fetch(url, { signal: AbortSignal.timeout(SAMPLE_TIMEOUT_MS), cache: "no-store" });
  if (!response.ok) throw new Error(`Voice Library sample returned ${response.status}.`);
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > PREVIEW_MAX_BYTES) throw new Error("Voice Library sample is too large.");
  return Buffer.from(await response.arrayBuffer());
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
  const spentTodayUsd = previewSpendAllowed().allow
    ? await previewSpendTodayUsd().catch(() => Number.POSITIVE_INFINITY)
    : 0;
  const voiceVersion = personal?.voiceVersion ?? 1;
  const plan = planVoicePreview({
    voiceAppId: decision.appVoiceId,
    language,
    ownerId: decision.ownerId,
    voiceVersion,
    providerVoiceId: personal?.providerVoiceId ?? narrator?.providerVoiceId ?? null,
    kind: decision.kind === "personal" ? "personal" : "default",
    selectable: true,
    narrator,
    spentTodayUsd,
  });
  if (plan.action === "forbidden") return previewError(plan.status, "not_ready", plan.error);

  const range = req.headers.get("range");
  const cached = await readCachedPreview(plan.cacheKey);
  if (cached) {
    return audioResponse(cached.bytes, range, { "X-Preview-Source": cached.source, "X-Preview-Cache": "hit" });
  }
  if (plan.action === "unavailable") {
    const detail = UNAVAILABLE[plan.reason];
    return previewError(detail.status, plan.reason, detail.error);
  }
  // Local test parent never calls ElevenLabs. AB-17 also refuses a stand-in clip, so the picker hears nothing.
  if (plan.action === "generate" && localTestParentEnabled()) {
    const detail = UNAVAILABLE.no_provider_voice;
    return previewError(detail.status, "no_provider_voice", detail.error);
  }

  let job = inflight.get(plan.cacheKey);
  if (!job) {
    job = produce(plan, {
      requesterId: auth.user.id,
      voiceAppId: decision.appVoiceId,
      ownerUserId: decision.ownerId,
      language,
      voiceVersion,
    }).finally(() => inflight.delete(plan.cacheKey));
    inflight.set(plan.cacheKey, job);
  }
  const produced = await job;
  if (!produced.ok) return previewError(produced.status, produced.reason, produced.error);
  return audioResponse(produced.bytes, range, { "X-Preview-Source": produced.source, "X-Preview-Cache": "miss" });
}

async function produce(
  plan: Extract<PreviewPlan, { action: "library" | "generate" }>,
  who: { requesterId: string; voiceAppId: string; ownerUserId: string | null; language: string; voiceVersion: number }
): Promise<Produced> {
  const unavailable: Produced = {
    ok: false,
    status: 502,
    reason: plan.action === "library" ? "sample_unavailable" : "provider_failed",
    error: "We couldn't load this preview. Try again in a moment.",
  };
  let bytes: Buffer;
  let modelId: string;
  try {
    if (plan.action === "library") {
      bytes = await fetchLibrarySample(plan.url);
      modelId = plan.sampleModelId || "voice-library";
    } else {
      await recordPreviewAttempt(who.requesterId);
      modelId = resolveTtsModelId();
      const capability = getModelCapability(modelId);
      const settings = settingsForSelectedModel(capability, plan.language, undefined, activeTtsConfig().id);
      const request = buildElevenSpeechRequest({ text: plan.script, modelId, language: plan.language, voiceSettings: settings });
      bytes = await speakWithElevenRequest(plan.providerVoiceId, request);
    }
  } catch (error) {
    console.warn(`[voice-preview] ${plan.action} failed`, error instanceof Error ? error.message : error);
    return unavailable;
  }
  const check = checkPreviewAudio(bytes);
  if (!check.ok) {
    console.warn(`[voice-preview] ${plan.action} audio refused: ${check.problem}`);
    return { ...unavailable, reason: "invalid_audio" };
  }
  const source: ServablePreviewSource = plan.action === "library" ? "library" : "generated";
  await rememberPreview({
    cacheKey: plan.cacheKey,
    voiceAppId: who.voiceAppId,
    ownerUserId: who.ownerUserId,
    language: who.language,
    modelId,
    voiceVersion: who.voiceVersion,
    source,
    bytes,
  });
  return { ok: true, bytes, source };
}
