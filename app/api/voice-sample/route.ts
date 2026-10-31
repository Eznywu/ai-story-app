import { NextResponse } from "next/server";
import { saveMediaBytes } from "@/lib/media/objectStore";
import { getErrorMessage } from "@/lib/errors";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function voiceFilename(originalName: string) {
  const cleaned = originalName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 48);
  const suffix = cleaned && cleaned !== "." ? cleaned : "sample.webm";
  return `voice_${Date.now()}_${suffix}`;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (!buffer.length) {
      return NextResponse.json({ error: "Empty recording" }, { status: 400 });
    }

    const filename = voiceFilename(file.name || "sample.webm");
    const saved = await saveMediaBytes({
      folder: "voices",
      filename,
      body: buffer,
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      ok: true,
      filename: saved.filename,
      url: saved.url,
      size: buffer.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err, "Upload failed") }, { status: 500 });
  }
}
