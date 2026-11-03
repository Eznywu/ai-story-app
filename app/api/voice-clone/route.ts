import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import {
  accountCanOwnVoices,
  deletePrivateSample,
  prismaVoiceStore,
  savePrivateSample,
} from "@/lib/voices/accountVoices";
import { createPersonalVoice, retryVoiceCleanups } from "@/lib/voices/personalVoice";
import { voiceProviderFromEnv } from "@/lib/voices/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function flag(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "1" || value === "on";
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  if (!accountCanOwnVoices(auth.user.email)) {
    return jsonNoStore(
      {
        error: "A personal voice needs a signed-in account. It is not saved on the shared guest.",
        personalVoices: "sign-in-required",
      },
      403
    );
  }
  const form = await req.formData().catch(() => null);
  if (!form) return jsonNoStore({ error: "The upload did not arrive. Please try again." }, 400);
  const file = form.get("file");
  if (!(file instanceof File)) return jsonNoStore({ error: "The recording was missing. Please try again." }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const provider = voiceProviderFromEnv();
  const store = prismaVoiceStore();
  await retryVoiceCleanups({ store, provider, deleteSample: deletePrivateSample }, 3).catch(() => {});
  const result = await createPersonalVoice(
    {
      userId: auth.user.id,
      idempotencyKey: req.headers.get("idempotency-key") || String(form.get("idempotencyKey") || ""),
      name: String(form.get("name") || ""),
      language: form.get("language"),
      recordingLocale: form.get("recordingLocale"),
      scriptVersion: form.get("scriptVersion"),
      bytes,
      durationMs: Number(form.get("durationMs")),
      voicedMs: Number(form.get("voicedMs")),
      clipped: flag(form.get("clipped")),
      consentAccepted: flag(form.get("consent")),
      consentTextVersion: form.get("consentTextVersion"),
      contentType: file.type,
    },
    {
      store,
      provider,
      now: new Date(),
      saveSample: savePrivateSample,
      deleteSample: deletePrivateSample,
    }
  );
  if (!result.ok) return jsonNoStore({ error: result.error }, result.status);
  return jsonNoStore({
    voice: {
      id: result.voice.id,
      name: result.voice.displayName,
      language: result.voice.language,
      recordingLocale: result.voice.recordingLocale,
      scriptVersion: result.voice.scriptVersion,
      status: result.voice.status,
      selectable: result.voice.status === "ready" && !result.voice.requiresVerification,
    },
    replayed: result.replayed,
  });
}
