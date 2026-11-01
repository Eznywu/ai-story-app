import { createHash, timingSafeEqual } from "node:crypto";

function sameSecret(given: string, secret: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; manual runs may use `x-cron-secret`. Closed when the secret is unset. */
export function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ") && sameSecret(bearer.slice(7), secret)) return true;
  const header = req.headers.get("x-cron-secret");
  return header !== null && sameSecret(header, secret);
}
