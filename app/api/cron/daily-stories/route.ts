import { NextResponse } from "next/server";
import { captureException } from "@/lib/monitoring";
import { getErrorMessage } from "@/lib/errors";
import { runDailyAutomatedStories } from "@/lib/stories/dailyAutomatedStories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

async function handle() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const result = await runDailyAutomatedStories(new Date());

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      captureException(new Error(err.message), {
        route: "/api/cron/daily-stories",
        slot: err.slot,
      });
    }
  }

  const savedAny = result.created.length > 0;

  return NextResponse.json(
    {
      ok: savedAny,
      created: result.created,
      errors: result.errors,
    },
    { status: savedAny ? 200 : 500 }
  );
}

export async function GET(req: Request) {
  try {
    if (!authorizeCron(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return await handle();
  } catch (e: unknown) {
    captureException(e, { route: "/api/cron/daily-stories" });
    return NextResponse.json(
      { error: getErrorMessage(e, "Daily stories job failed") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
