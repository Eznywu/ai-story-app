import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getErrorMessage } from "@/lib/errors";
import {
  appendSessionCookie,
  getSessionFromRequest,
  signSession,
} from "@/lib/authSession";

export const runtime = "nodejs";

function safeEqualString(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  try {
    return timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = String(body.code ?? "").trim();
    const expected = String(process.env.MEMBERSHIP_CODE ?? "").trim();

    if (!expected) {
      return NextResponse.json(
        { error: "Membership is not configured (MEMBERSHIP_CODE)." },
        { status: 503 }
      );
    }

    if (!code || !safeEqualString(code, expected)) {
      return NextResponse.json({ error: "Invalid membership code." }, { status: 403 });
    }

    const token = signSession({ sub: session.sub, m: 1 });
    const res = NextResponse.json({ ok: true, member: true });
    appendSessionCookie(res, token);
    return res;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Could not activate membership.") },
      { status: 500 }
    );
  }
}
