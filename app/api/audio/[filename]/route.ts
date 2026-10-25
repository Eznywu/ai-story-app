import { NextResponse } from "next/server";
import fs from "fs/promises";
import { requireUser } from "@/lib/auth/requireUser";
import { userOwnsMedia } from "@/lib/auth/ownedStory";
import { isRemoteMediaUrl, localMediaPath } from "@/lib/media/objectStore";
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
      return new Response(data, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      const story = await prisma.story.findFirst({
        where: { userId: auth.user.id, audioFilename: filename },
        select: { audioUrl: true },
      });
      if (story?.audioUrl && isRemoteMediaUrl(story.audioUrl)) {
        return NextResponse.redirect(story.audioUrl, 302);
      }
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
