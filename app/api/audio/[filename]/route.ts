import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth/requireUser";
import { userOwnsMedia } from "@/lib/auth/ownedStory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const url = new URL(req.url);
    const filename = decodeURIComponent(url.pathname.split("/").pop() || "");

    const isSafe =
      filename.length > 0 &&
      !filename.includes("..") &&
      !filename.includes("/") &&
      !filename.includes("\\") &&
      filename.endsWith(".mp3");

    if (!isSafe) {
      return NextResponse.json({ error: "Invalid filename", filename }, { status: 400 });
    }

    const owned = await userOwnsMedia(auth.user.id, "audio", filename);
    if (!owned) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "uploads", "audio", filename);
    const data = await fs.readFile(filePath);

    return new Response(data, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
