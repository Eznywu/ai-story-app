import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = `voice_${Date.now()}_${file.name.replaceAll(" ", "_")}`;
    const filePath = path.join(uploadsDir, safeName);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      filename: safeName,
      size: buffer.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 });
  }
}
