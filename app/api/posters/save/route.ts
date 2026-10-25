import { NextResponse } from "next/server";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { captureException } from "@/lib/monitoring";
import { saveStoryPosterFile } from "@/lib/audio/storyMediaFiles";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { findOwnedStory } from "@/lib/auth/ownedStory";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_POSTER_BYTES = 12 * 1024 * 1024;

function stripBase64Payload(input: string): string {
  const s = input.trim();
  const comma = s.indexOf(",");
  if (s.startsWith("data:") && comma >= 0) {
    return s.slice(comma + 1);
  }
  return s;
}

function bufferLooksLikePng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      storyId?: string;
      imageBase64?: string;
    };

    const storyId = typeof body.storyId === "string" ? body.storyId.trim() : "";
    const b64Raw = typeof body.imageBase64 === "string" ? body.imageBase64 : "";

    if (!storyId || !isSafeStoryId(storyId)) {
      return NextResponse.json({ error: "Valid storyId is required." }, { status: 400 });
    }

    const payload = stripBase64Payload(b64Raw);
    if (!payload) {
      return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(payload, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid base64 image." }, { status: 400 });
    }

    if (!buffer.length || buffer.length > MAX_POSTER_BYTES) {
      return NextResponse.json(
        { error: `Poster file must be between 1 and ${MAX_POSTER_BYTES} bytes.` },
        { status: 400 }
      );
    }

    if (!bufferLooksLikePng(buffer)) {
      return NextResponse.json({ error: "Uploaded file is not a PNG." }, { status: 400 });
    }

    const exists = await findOwnedStory(auth.user.id, storyId);
    if (!exists) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    const posterUrl = await saveStoryPosterFile(storyId, buffer);
    const filename = decodeURIComponent(posterUrl.split("/").pop()?.split("?")[0] || "");
    console.info("[/api/posters/save] wrote", { storyId, posterUrl, bytes: buffer.length });

    return NextResponse.json({
      ok: true,
      filename,
      posterUrl,
      size: buffer.length,
    });
  } catch (err: unknown) {
    captureException(err, { route: "/api/posters/save" });
    const message = getErrorMessage(err, "Poster save failed.");
    const status = getErrorStatus(err, 500);
    console.error("[/api/posters/save] failed", message);
    return NextResponse.json({ error: message }, { status });
  }
}
