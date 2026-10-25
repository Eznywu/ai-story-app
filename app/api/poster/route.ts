import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { captureException } from "@/lib/monitoring";
import { saveStoryPosterFile } from "@/lib/audio/storyMediaFiles";
import { posterRoutePublicError } from "@/lib/posters/posterDiagnostics";
import { generatePosterPngBuffer } from "@/lib/posters/posterImage";
import { findOwnedStory } from "@/lib/auth/ownedStory";
import { requireUser } from "@/lib/auth/requireUser";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { VERCEL_FUNCTION_MAX_SECONDS } from "@/lib/vercelDuration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = VERCEL_FUNCTION_MAX_SECONDS;

type Body = {
  title?: string;
  story?: string;
  genre?: string;
  storyId?: string;
};

function bufferLooksLikePng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const title = typeof body.title === "string" ? body.title : "";
    const story = typeof body.story === "string" ? body.story : "";
    const genre = typeof body.genre === "string" ? body.genre : undefined;
    const storyId = typeof body.storyId === "string" ? body.storyId.trim() : "";

    if (!story.trim()) {
      return NextResponse.json({ error: "Story text is required for a poster." }, { status: 400 });
    }

    const buffer = await generatePosterPngBuffer({ title, story, genre });

    if (!buffer || buffer.length === 0) {
      console.error("[/api/poster] generatePosterPngBuffer returned empty buffer");
      return NextResponse.json(
        { error: "Poster image was empty from the AI provider." },
        { status: 502 }
      );
    }

    if (!bufferLooksLikePng(buffer)) {
      console.error("[/api/poster] buffer is not a valid PNG signature", {
        byteLength: buffer.length,
        headHex: buffer.subarray(0, Math.min(16, buffer.length)).toString("hex"),
      });
    }

    const headers = new Headers({
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    });

    if (storyId && isSafeStoryId(storyId)) {
      const owned = await findOwnedStory(auth.user.id, storyId);
      if (owned) {
        try {
          const posterUrl = await saveStoryPosterFile(storyId, buffer);
          headers.set("X-Poster-Url", posterUrl);
        } catch (err: unknown) {
          console.error("[/api/poster] save failed", getErrorMessage(err, "save failed"));
          headers.set("X-Poster-Save-Error", "Poster image could not be saved on the story.");
        }
      }
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    captureException(err, { route: "/api/poster" });
    const detail = getErrorMessage(err, "Poster image failed.");
    const { status, error, logReason } = posterRoutePublicError(err);
    console.error("[/api/poster] failed", {
      logReason,
      httpStatus: status,
      publicError: error,
      detail: detail.slice(0, 400),
    });
    return NextResponse.json({ error }, { status });
  }
}
