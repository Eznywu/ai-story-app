import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/authSession";
import { getDefaultStoryText, getDefaultStoryTitle } from "@/lib/defaultStory";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const s = getSessionFromRequest(req);
  return NextResponse.json({
    loggedIn: Boolean(s),
    member: Boolean(s && s.m === 1),
    email: s?.sub ?? null,
    defaultStory: {
      title: getDefaultStoryTitle(),
      text: getDefaultStoryText(),
    },
  });
}
