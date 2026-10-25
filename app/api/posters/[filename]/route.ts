import fs from "fs/promises";
import { NextResponse } from "next/server";
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
    const filePath = localMediaPath("posters", filename);

    if (!filePath) {
      return new Response(JSON.stringify({ error: "Invalid filename" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const owned = await userOwnsMedia(auth.user.id, "poster", filename);
    if (!owned) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const data = await fs.readFile(filePath);
      return new Response(new Uint8Array(data), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      const story = await prisma.story.findFirst({
        where: { userId: auth.user.id, posterFilename: filename },
        select: { posterUrl: true },
      });
      if (story?.posterUrl && isRemoteMediaUrl(story.posterUrl)) {
        return NextResponse.redirect(story.posterUrl, 302);
      }
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
