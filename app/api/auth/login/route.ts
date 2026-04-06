import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getErrorMessage } from "@/lib/errors";
import { appendSessionCookie, signSession } from "@/lib/authSession";

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
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const expectedEmail = String(process.env.AUTH_LOGIN_EMAIL ?? "").trim().toLowerCase();
    const expectedPassword = String(process.env.AUTH_LOGIN_PASSWORD ?? "");

    if (!expectedEmail || !expectedPassword) {
      return NextResponse.json(
        { error: "Login is not configured (AUTH_LOGIN_EMAIL / AUTH_LOGIN_PASSWORD)." },
        { status: 503 }
      );
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (!safeEqualString(email, expectedEmail) || !safeEqualString(password, expectedPassword)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = signSession({ sub: email, m: 0 });
    const res = NextResponse.json({ ok: true, member: false });
    appendSessionCookie(res, token);
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err, "Login failed.") }, { status: 500 });
  }
}
