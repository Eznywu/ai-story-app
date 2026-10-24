import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { captureException } from "@/lib/monitoring";
import { posterRoutePublicError } from "@/lib/posters/posterDiagnostics";
import { generatePosterPngBuffer } from "@/lib/posters/posterImage";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  title?: string;
  story?: string;
  genre?: string;
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

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
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
