import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const stories = await prisma.story.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(stories);
}

export async function POST(req: Request) {
  const { title, genre, length, text } = await req.json();

  if (!title || !genre || !length || !text) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const story = await prisma.story.create({
    data: { title, genre, length, text },
  });

  return NextResponse.json(story);
}
