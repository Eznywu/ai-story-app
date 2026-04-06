import { NextResponse } from "next/server";
import { appendClearSessionCookie } from "@/lib/authSession";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  appendClearSessionCookie(res);
  return res;
}
