import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureException } from "@/lib/monitoring";
import { getErrorMessage } from "@/lib/errors";
import { runWeeklyNarrationReview } from "@/lib/tts/weeklyJob";
import { retryVoiceCleanups } from "@/lib/voices/personalVoice";
import { deletePrivateSample, prismaVoiceStore } from "@/lib/voices/accountVoices";
import { voiceProviderFromEnv } from "@/lib/voices/provider";
import type { Prisma } from "../../../../generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Monday 10:00 in UTC+8 is 02:00 UTC, which is `0 2 * * 1` in vercel.json.
 * Vercel runs crons on production deployments only. This route is not active
 * until that production deploy exists and CRON_SECRET is set. This job does
 * not generate audio. It may retry deleting a personal voice that was already
 * marked for removal.
 */
function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

export async function GET(req: Request) {
  try {
    if (!authorizeCron(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const report = await runWeeklyNarrationReview({
      loadUnresolved: async () => {
        const rows = await prisma.narrationReviewItem.findMany({
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
          take: 200,
          select: { id: true, assetId: true, createdAt: true },
        });
        const assetIds = rows.map((row) => row.assetId).filter((id): id is string => Boolean(id));
        const assets = assetIds.length
          ? await prisma.narrationAsset.findMany({
              where: { id: { in: assetIds } },
              select: { id: true, url: true, voiceId: true, language: true, voiceKind: true },
            })
          : [];
        const byId = new Map(assets.map((asset) => [asset.id, asset]));
        return rows.map((row) => {
          const asset = row.assetId ? byId.get(row.assetId) : undefined;
          return {
            id: row.id,
            url: asset?.url ?? null,
            createdAt: row.createdAt.toISOString(),
            voiceId: asset?.voiceId,
            language: asset?.language,
            voiceKind: asset?.voiceKind,
          };
        });
      },
      loadNewClips: async () => {
        const rows = await prisma.narrationAsset.findMany({
          where: { createdAt: { gte: since }, status: "active", sectionIndex: 0 },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, url: true, createdAt: true, voiceId: true, language: true, voiceKind: true },
        });
        return rows.map((row) => ({
          id: row.id,
          url: row.url,
          createdAt: row.createdAt.toISOString(),
          voiceId: row.voiceId,
          language: row.language,
          voiceKind: row.voiceKind,
        }));
      },
      saveReport: async (summary) => {
        await prisma.narrationReviewReport.create({
          data: {
            weekKey: summary.weekKey,
            status: summary.outcome,
            summary: summary as unknown as Prisma.InputJsonValue,
          },
        });
      },
    });
    const cleanup = await retryVoiceCleanups(
      { store: prismaVoiceStore(), provider: voiceProviderFromEnv(), deleteSample: deletePrivateSample },
      5
    ).catch(() => ({ done: 0, pending: 0 }));
    return NextResponse.json({
      ok: true,
      scheduled: false,
      schedule: "0 2 * * 1",
      scheduleMeaning: "Monday 10:00 UTC+8, only after a production deploy",
      report,
      voiceCleanup: cleanup,
    });
  } catch (error: unknown) {
    captureException(error, { route: "/api/cron/narration-review" });
    return NextResponse.json({ error: getErrorMessage(error, "Narration review job failed") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
