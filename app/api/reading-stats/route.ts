import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { parseReadingStats } from "@/lib/profiles/familyRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const row = await prisma.readingStats.findUnique({ where: { userId: auth.user.id } });
  if (!row) return jsonNoStore({ readingStats: null });
  return jsonNoStore({
    readingStats: {
      todayKey: row.todayKey,
      storiesReadToday: row.storiesReadToday,
      streakDays: row.streakDays,
      lastReadDayKey: row.lastReadDayKey,
      lastStoryId: row.lastStoryId,
      lastStoryTitle: row.lastStoryTitle,
      draftSummary: row.draftSummary,
    },
  });
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { readingStats?: unknown };
  let readingStats;
  try {
    readingStats = parseReadingStats(body.readingStats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reading stats were not valid.";
    return jsonNoStore({ error: message }, 400);
  }

  await prisma.readingStats.upsert({
    where: { userId: auth.user.id },
    create: { userId: auth.user.id, ...readingStats },
    update: readingStats,
  });

  return jsonNoStore({ readingStats });
}
