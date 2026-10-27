import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureException } from "@/lib/monitoring";
import { getErrorMessage } from "@/lib/errors";
import { runWeeklyNarrationReview } from "@/lib/tts/weeklyJob";
import type { Prisma } from "../../../../generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Monday 10:00 in UTC+8 is 02:00 UTC, which is `0 2 * * 1` in vercel.json.
 * Vercel runs crons on production deployments only. This route is not active
 * until that production deploy exists and CRON_SECRET is set. This file does
 * not call ElevenLabs or any speech service.
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
          select: { id: true, createdAt: true },
        });
        return rows.map((row) => ({ id: row.id, createdAt: row.createdAt.toISOString() }));
      },
      loadNewClips: async () => {
        const rows = await prisma.narrationAsset.findMany({
          where: { createdAt: { gte: since }, status: "active", sectionIndex: 0 },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, url: true, createdAt: true },
        });
        return rows.map((row) => ({
          id: row.id,
          url: row.url,
          createdAt: row.createdAt.toISOString(),
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
    return NextResponse.json({
      ok: true,
      scheduled: false,
      schedule: "0 2 * * 1",
      scheduleMeaning: "Monday 10:00 UTC+8, only after a production deploy",
      report,
    });
  } catch (error: unknown) {
    captureException(error, { route: "/api/cron/narration-review" });
    return NextResponse.json({ error: getErrorMessage(error, "Narration review job failed") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
