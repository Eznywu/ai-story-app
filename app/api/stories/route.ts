import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { StoryCreateInput } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";
import { parseChildGenderFromClient } from "@/lib/profiles/childGender";

export const runtime = "nodejs";

function withPosterUrl<T extends { posterFilename: string | null }>(row: T) {
  const { posterFilename, ...rest } = row;
  return {
    ...rest,
    posterFilename,
    posterUrl: posterFilename
      ? `/api/posters/${encodeURIComponent(posterFilename)}`
      : null,
  };
}

export async function GET() {
  try {
    const stories = await prisma.story.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ stories: stories.map(withPosterUrl) });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load stories") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as StoryCreateInput;

    const titleInput = String(body.title ?? "").trim();
    const genre = String(body.genre ?? "").trim();
    const length = String(body.length ?? "").trim();
    const text = String(body.text ?? body.story ?? "").trim();
    const age = body.age ? String(body.age).trim() : null;
    const language = body.language ? String(body.language).trim() : null;
    const mainCharacterName = body.mainCharacterName
      ? String(body.mainCharacterName).trim()
      : null;
    const childGender = parseChildGenderFromClient(body.childGender);

    if (!genre || !length || !text) {
      return NextResponse.json(
        { error: "Missing fields: genre, length, and text/story are required" },
        { status: 400 }
      );
    }

    const title = titleInput || "Untitled Story";

    const story = await prisma.story.create({
      data: {
        title,
        genre,
        length,
        text,
        age,
        language,
        mainCharacterName,
        childGender,
      },
    });

    return NextResponse.json({ story });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to save story") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim() || "";
    if (!id) {
      return NextResponse.json({ error: "Missing story id" }, { status: 400 });
    }
    await prisma.story.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to delete story") },
      { status: 500 }
    );
  }
}
