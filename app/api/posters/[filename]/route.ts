import fs from "fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { userOwnsPicture } from "@/lib/auth/ownedStory";
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

    const owned = await userOwnsPicture(auth.user.id, filename);
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
        where: {
          userId: auth.user.id,
          OR: [
            { posterFilename: filename },
            { illustrationFilename: filename },
            { coverFilename: filename },
          ],
        },
        select: { posterUrl: true, illustrationUrl: true, coverUrl: true, posterFilename: true, illustrationFilename: true, coverFilename: true },
      });
      const remote =
        story?.posterFilename === filename
          ? story.posterUrl
          : story?.illustrationFilename === filename
            ? story.illustrationUrl
            : story?.coverFilename === filename
              ? story.coverUrl
              : null;
      if (remote && isRemoteMediaUrl(remote)) {
        return NextResponse.redirect(remote, 302);
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
