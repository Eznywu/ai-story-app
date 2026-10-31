import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { makeCloneVoiceId } from "@/lib/voices/voices";
import { VOICES } from "@/lib/voices/voices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ELEVEN_ID = /^[A-Za-z0-9]{8,80}$/;

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").trim().slice(0, max);
}

function normalizeLanguage(value: unknown): string {
  const language = clip(value, 20).toLowerCase();
  if (language.startsWith("zh")) return "zh-Hant";
  return "en";
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const clones = await prisma.voice.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
  });

  return jsonNoStore({
    voices: [
      ...clones.map((row) => ({
        id: makeCloneVoiceId(row.voiceId),
        name: row.displayName,
        language: row.language,
        provider: row.provider,
        voiceId: row.voiceId,
      })),
      ...VOICES.map((voice) => ({
        id: voice.id,
        name: voice.name,
        language: voice.language,
        isDefault: Boolean(voice.isDefault),
        provider: "elevenlabs",
        voiceId: voice.elevenId,
      })),
    ],
  });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    elevenVoiceId?: unknown;
    voiceId?: unknown;
    label?: unknown;
    name?: unknown;
    language?: unknown;
  };
  const rawId = clip(body.elevenVoiceId ?? body.voiceId, 90);
  const elevenVoiceId = rawId.startsWith("clone:") ? rawId.slice("clone:".length) : rawId;
  if (!ELEVEN_ID.test(elevenVoiceId)) {
    return jsonNoStore({ error: "That voice id is not valid." }, 400);
  }

  const existing = await prisma.voice.findFirst({ where: { voiceId: elevenVoiceId } });
  if (existing && existing.userId !== auth.user.id) {
    return jsonNoStore({ error: "That voice belongs to another account." }, 409);
  }

  const displayName = clip(body.label ?? body.name, 80) || "My voice";
  const language = normalizeLanguage(body.language);
  const row = existing
    ? await prisma.voice.update({
        where: { id: existing.id },
        data: { displayName, language },
      })
    : await prisma.voice.create({
        data: {
          userId: auth.user.id,
          displayName,
          voiceId: elevenVoiceId,
          language,
        },
      });

  return jsonNoStore({
    voice: {
      id: makeCloneVoiceId(row.voiceId),
      name: row.displayName,
      language: row.language,
      voiceId: row.voiceId,
    },
  });
}

export async function DELETE() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  await prisma.voice.deleteMany({ where: { userId: auth.user.id } });
  return jsonNoStore({ ok: true });
}
