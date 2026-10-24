import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/config";
import { jsonNoStore } from "@/lib/auth/requireUser";
import { destroyCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await destroyCurrentSession();
  const res = jsonNoStore({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}
