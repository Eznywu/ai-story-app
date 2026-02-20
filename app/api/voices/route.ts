// app/api/voices/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust path if needed

export async function GET() {
  try {
    const voices = await prisma.voice.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        displayName: true,
        provider: true,
        voiceId: true,
        createdAt: true,
      },
    });

    // return fields the UI expects: { id, name, language }
    // language isn't in your model, so we omit it (UI can handle it).
    return NextResponse.json({
      voices: voices.map((v) => ({
        id: v.id,
        name: v.displayName ?? v.voiceId ?? v.id,
        // language: undefined
        provider: v.provider,
        voiceId: v.voiceId,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load voices" },
      { status: 500 }
    );
  }
}