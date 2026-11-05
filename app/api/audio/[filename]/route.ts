import { NextResponse } from "next/server";
import fs from "fs/promises";
import { audioResponse } from "@/lib/audio/audioResponse";
import { requireUser } from "@/lib/auth/requireUser";
import { isRemoteMediaUrl, localMediaPath, readPrivateMedia } from "@/lib/media/objectStore";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "File not found" }, { status: 404 });

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const url = new URL(req.url);
    const filename = decodeURIComponent(url.pathname.split("/").pop() || "");
    const filePath = localMediaPath("audio", filename);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const story = await prisma.story.findFirst({
      where: { userId: auth.user.id, audioFilename: filename },
      select: { audioUrl: true, audioPrivate: true, audioStorageUrl: true },
    });
    if (!story) return notFound();

    const local = await fs.readFile(filePath).catch(() => null);
    if (local) return audioResponse(local, req.headers.get("range"));

    if (story.audioPrivate) {
      const bytes = await readPrivateMedia({ folder: "audio", filename, storageUrl: story.audioStorageUrl });
      return bytes ? audioResponse(bytes, req.headers.get("range")) : notFound();
    }
    if (story.audioUrl && isRemoteMediaUrl(story.audioUrl)) {
      return NextResponse.redirect(story.audioUrl, 302);
    }
    return notFound();
  } catch (err) {
    console.error("[audio] could not read a private recording", err instanceof Error ? err.message : err);
    return notFound();
  }
}
