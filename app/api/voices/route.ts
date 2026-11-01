import { localTestParentEnabled } from "@/lib/auth/config";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { accountCanOwnVoices, listOwnedVoices } from "@/lib/voices/accountVoices";
import { personalVoiceLimit } from "@/lib/voices/limits";
import { normalizeAppLanguage } from "@/lib/voices/language";
import { DEFAULT_NARRATORS } from "@/lib/voices/registry";
import { toPublicDefault, toPublicPersonal } from "@/lib/voices/decisions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const language = normalizeAppLanguage(new URL(req.url).searchParams.get("language"));
  const canOwn = accountCanOwnVoices(auth.user.email);
  const testParent = localTestParentEnabled();
  const owned = canOwn ? await listOwnedVoices(auth.user.id) : [];
  return jsonNoStore({
    personalVoices: canOwn ? "available" : "sign-in-required",
    authEnabled: canOwn,
    localTestParent: testParent,
    voiceLimit: personalVoiceLimit(),
    voices: [
      ...DEFAULT_NARRATORS.map((voice) => toPublicDefault(voice, language)),
      ...owned.map((voice) => ({ ...toPublicPersonal(voice, language), testVoice: testParent })),
    ],
  });
}
