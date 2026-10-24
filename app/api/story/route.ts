import { NextResponse } from "next/server";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { captureException } from "@/lib/monitoring";
import { generateStoryWithRetry } from "@/lib/stories/storyGenerator";
import type { StoryGenerationInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as StoryGenerationInput;
    const story = await generateStoryWithRetry(body, { retries: 1 });
    return NextResponse.json({ story });
  } catch (err: unknown) {
    captureException(err, { route: "/api/story" });
    const message = getErrorMessage(err, "Unknown error");
    const status = getErrorStatus(
      err,
      message.includes("OPENAI_API_KEY") ? 500 : 502
    );
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}