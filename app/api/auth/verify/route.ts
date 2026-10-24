import { normalizeEmail, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/config";
import { verifyLoginCode } from "@/lib/auth/loginCodes";
import { jsonNoStore } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; code?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) {
    return jsonNoStore({ error: "Enter a valid email address." }, 400);
  }
  const code = typeof body.code === "string" ? body.code : "";
  const result = await verifyLoginCode(email, code);
  if (!result.ok) {
    return jsonNoStore({ error: result.error }, result.status);
  }

  const res = jsonNoStore({ ok: true, user: result.user });
  res.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions());
  return res;
}
