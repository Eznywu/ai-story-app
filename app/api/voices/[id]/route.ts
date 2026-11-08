import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import {
  accountCanOwnVoices,
  deletePrivateSample,
  findOwnedVoice,
  listOwnedVoices,
  prismaVoiceStore,
} from "@/lib/voices/accountVoices";
import { authorizeOwnedVoice } from "@/lib/voices/decisions";
import { deletePersonalVoice } from "@/lib/voices/personalVoice";
import { voiceProviderFromEnv } from "@/lib/voices/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function voiceIdFrom(req: Request): string {
  const url = new URL(req.url);
  return decodeURIComponent(url.pathname.split("/").pop() || "").trim();
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  if (!accountCanOwnVoices(auth.user.email)) {
    return jsonNoStore({ error: "Sign in with your own account before changing a personal voice." }, 403);
  }
  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name) return jsonNoStore({ error: "Add a name for this voice." }, 400);
  const owned = await listOwnedVoices(auth.user.id);
  const allowed = authorizeOwnedVoice({ requesterId: auth.user.id, voiceId: voiceIdFrom(req), owned });
  if (!allowed.ok) return jsonNoStore({ error: allowed.error }, allowed.status);
  const updated = await prismaVoiceStore().update(allowed.voice.id, auth.user.id, { displayName: name });
  if (!updated) return jsonNoStore({ error: "That voice is not on this account." }, 404);
  return jsonNoStore({ voice: { id: updated.id, name: updated.displayName, language: updated.language, status: updated.status } });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  if (!accountCanOwnVoices(auth.user.email)) {
    return jsonNoStore({ error: "Sign in with your own account before deleting a personal voice." }, 403);
  }
  const body = (await req.json().catch(() => ({}))) as { deleteGeneratedAudio?: unknown };
  const result = await deletePersonalVoice(
    {
      userId: auth.user.id,
      voiceId: voiceIdFrom(req),
      deleteGeneratedAudio: body.deleteGeneratedAudio === true,
    },
    {
      store: prismaVoiceStore(),
      provider: voiceProviderFromEnv(),
      findOwned: findOwnedVoice,
      deleteSample: deletePrivateSample,
    }
  );
  if (!result.ok) return jsonNoStore({ error: result.error }, result.status);
  return jsonNoStore(result);
}
