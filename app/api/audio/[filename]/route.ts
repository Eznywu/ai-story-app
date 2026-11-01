import { NextResponse } from "next/server";
import fs from "fs/promises";
import { requireUser } from "@/lib/auth/requireUser";
import { userOwnsMedia } from "@/lib/auth/ownedStory";
import { isRemoteMediaUrl, localMediaPath, readPrivateMedia } from "@/lib/media/objectStore";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const url = new URL(req.url);
    const filename = decodeURIComponent(url.pathname.split("/").pop() || "");
    const filePath = localMediaPath("audio", filename);

    if (!filePath) {
      return NextResponse.json({ error: "Invalid filename", filename }, { status: 400 });
    }

    const owned = await userOwnsMedia(auth.user.id, "audio", filename);
    if (!owned) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
      const data = await fs.readFile(filePath);
      const total = data.byteLength;
      const range = req.headers.get("range");
      const shared = {
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      };
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        if (!match) {
          return new Response(null, { status: 416, headers: { ...shared, "Content-Range": `bytes */${total}` } });
        }
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Number(match[2]) : total - 1;
        if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
          return new Response(null, { status: 416, headers: { ...shared, "Content-Range": `bytes */${total}` } });
        }
        const safeEnd = Math.min(end, total - 1);
        const slice = data.subarray(start, safeEnd + 1);
        return new Response(slice, {
          status: 206,
          headers: {
            ...shared,
            "Content-Length": String(slice.byteLength),
            "Content-Range": `bytes ${start}-${safeEnd}/${total}`,
          },
        });
      }
      return new Response(data, {
        headers: {
          ...shared,
          "Content-Length": String(total),
        },
      });
    } catch {
      const story = await prisma.story.findFirst({
        where: { userId: auth.user.id, audioFilename: filename },
        select: { audioUrl: true, audioPrivate: true, audioStorageUrl: true },
      });
      if (story?.audioPrivate) {
        const bytes = await readPrivateMedia({
          folder: "audio",
          filename,
          storageUrl: story.audioStorageUrl,
        });
        if (!bytes) return NextResponse.json({ error: "File not found" }, { status: 404 });
        return new Response(new Uint8Array(bytes), {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": String(bytes.byteLength),
            "Cache-Control": "private, no-store",
          },
        });
      }
      if (story?.audioUrl && isRemoteMediaUrl(story.audioUrl)) {
        return NextResponse.redirect(story.audioUrl, 302);
      }
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
