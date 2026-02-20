import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(req: Request) {
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

    const filePath = path.join(process.cwd(), "uploads", "audio", filename);
    const data = await fs.readFile(filePath);

    return new Response(data, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
