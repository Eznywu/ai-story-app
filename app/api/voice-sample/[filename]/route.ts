import fs from "fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { localMediaPath } from "@/lib/media/objectStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const url = new URL(req.url);
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "");
  const filePath = localMediaPath("voices", filename);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }
  try {
    const data = await fs.readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
