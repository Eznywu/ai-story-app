import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { captureException } from "@/lib/monitoring";
import { isMemberRequest } from "@/lib/memberGate";

export const runtime = "nodejs";

const MAX_POSTER_BYTES = 12 * 1024 * 1024;

function stripBase64Payload(input: string): string {
  const s = input.trim();
  const comma = s.indexOf(",");
  if (s.startsWith("data:") && comma >= 0) {
    return s.slice(comma + 1);
  }
  return s;
}

function bufferLooksLikePng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

function safeStoryId(id: string): boolean {
  return /^[a-z0-9]+$/i.test(id) && id.length >= 16 && id.length <= 64;
}

export async function POST(req: Request) {
  try {
    if (!isMemberRequest(req)) {
      return NextResponse.json(
        { error: "Sign in and join membership to save posters." },
        { status: 403 }
      );
    }
    const body = (await req.json().catch(() => ({}))) as {
      storyId?: string;
      imageBase64?: string;
    };

    const storyId = typeof body.storyId === "string" ? body.storyId.trim() : "";
    const b64Raw = typeof body.imageBase64 === "string" ? body.imageBase64 : "";

    if (!storyId || !safeStoryId(storyId)) {
      return NextResponse.json({ error: "Valid storyId is required." }, { status: 400 });
    }

    const payload = stripBase64Payload(b64Raw);
    if (!payload) {
      return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(payload, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid base64 image." }, { status: 400 });
    }

    if (!buffer.length || buffer.length > MAX_POSTER_BYTES) {
      return NextResponse.json(
        { error: `Poster file must be between 1 and ${MAX_POSTER_BYTES} bytes.` },
        { status: 400 }
      );
    }

    if (!bufferLooksLikePng(buffer)) {
      return NextResponse.json({ error: "Uploaded file is not a PNG." }, { status: 400 });
    }

    const exists = await prisma.story.findUnique({ where: { id: storyId }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    const filename = `poster_${storyId}.png`;

    const dir = path.join(process.cwd(), "uploads", "posters");
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);

    await prisma.story.update({
      where: { id: storyId },
      data: { posterFilename: filename },
    });

    const posterUrl = `/api/posters/${encodeURIComponent(filename)}`;
    console.info("[/api/posters/save] wrote", { storyId, filename, bytes: buffer.length });

    return NextResponse.json({ ok: true, filename, posterUrl, size: buffer.length });
  } catch (err: unknown) {
    captureException(err, { route: "/api/posters/save" });
    const message = getErrorMessage(err, "Poster save failed.");
    const status = getErrorStatus(err, 500);
    console.error("[/api/posters/save] failed", message);
    return NextResponse.json({ error: message }, { status });
  }
}
