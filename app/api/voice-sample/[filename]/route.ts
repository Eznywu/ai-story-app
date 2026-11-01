import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { accountCanOwnVoices, readOwnedSample } from "@/lib/voices/accountVoices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  if (!accountCanOwnVoices(auth.user.email)) {
    return NextResponse.json({ error: "Sign in to hear a saved sample." }, { status: 403 });
  }
  const filename = decodeURIComponent(new URL(req.url).pathname.split("/").pop() || "");
  const data = await readOwnedSample(auth.user.id, filename);
  if (!data) return NextResponse.json({ error: "File not found" }, { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}
