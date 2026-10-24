import { clientIp, normalizeEmail } from "@/lib/auth/config";
import { sendLoginCode } from "@/lib/auth/loginCodes";
import { jsonNoStore } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) {
    return jsonNoStore({ error: "Enter a valid email address." }, 400);
  }

  const result = await sendLoginCode(email, clientIp(req));
  if (!result.ok) {
    return jsonNoStore(
      {
        error: result.error,
        ...(result.retryAfterSeconds ? { retryAfterSeconds: result.retryAfterSeconds } : {}),
      },
      result.status
    );
  }

  return jsonNoStore({
    ok: true,
    cooldownSeconds: result.cooldownSeconds,
  });
}
