import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { accountCanOwnVoices, listOwnedVoices } from "@/lib/voices/accountVoices";
import { authorizeSynthesis } from "@/lib/voices/decisions";
import { normalizeAppLanguage } from "@/lib/voices/language";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  if (!accountCanOwnVoices(auth.user.email)) {
    return jsonNoStore({ preference: null, storedOnServer: false });
  }
  const row = await prisma.voicePreference.findUnique({ where: { userId: auth.user.id } });
  return jsonNoStore({
    preference: row ? { voiceId: row.voiceAppId, language: row.language } : null,
    storedOnServer: true,
  });
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { voiceId?: unknown; language?: unknown };
  const voiceId = typeof body.voiceId === "string" ? body.voiceId.trim() : "";
  const language = normalizeAppLanguage(body.language);
  if (!accountCanOwnVoices(auth.user.email)) {
    return jsonNoStore({ storedOnServer: false, voiceId, language });
  }
  const owned = await listOwnedVoices(auth.user.id);
  const decision = authorizeSynthesis({ requesterId: auth.user.id, requestedId: voiceId, language, owned });
  if (!decision.ok || decision.kind === "legacy") {
    return jsonNoStore({ error: "That voice cannot be remembered." }, decision.ok ? 409 : decision.status);
  }
  await prisma.voicePreference.upsert({
    where: { userId: auth.user.id },
    create: { userId: auth.user.id, voiceAppId: decision.appVoiceId, language },
    update: { voiceAppId: decision.appVoiceId, language },
  });
  return jsonNoStore({ storedOnServer: true, voiceId: decision.appVoiceId, language });
}
