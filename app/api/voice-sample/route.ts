import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Samples are stored only as part of creating a personal voice. */
export async function POST() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  return NextResponse.json(
    { error: "Recordings are uploaded when you create a voice, after you agree. They are not stored on their own." },
    { status: 405 }
  );
}
