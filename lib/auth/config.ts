import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "hh_session";
export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;
export const SEND_MIN_INTERVAL_MS = 30 * 1000;
export const SEND_EMAIL_LIMIT = 5;
export const SEND_EMAIL_WINDOW_MS = 60 * 60 * 1000;
export const SEND_IP_LIMIT = 20;
export const SEND_IP_WINDOW_MS = 60 * 60 * 1000;
/** Chrome caps cookie lifetime at 400 days. Parents should rarely need to sign in again. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 400;

const DEV_AUTH_SECRET = "dev-only-auth-secret";

/**
 * Reserved library used while email sign-in is paused.
 * Not a deliverable address. The sign-in routes refuse it.
 */
export const GUEST_EMAIL = "guest@local.invalid";

export function isGuestEmail(email: string): boolean {
  return email.trim().toLowerCase() === GUEST_EMAIL;
}

/**
 * Email sign-in is paused unless this is explicitly on.
 * Unset, empty, false, off, and 0 stay off so a missing key cannot block the app.
 */
export function authEnabled(): boolean {
  const raw = (process.env.AUTH_ENABLED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on" || raw === "email";
}

/**
 * Log the one-time code only for a local dev server.
 * Vercel (preview or production) and `next start` never log codes.
 */
export function allowDevCodeLog(): boolean {
  if (process.env.VERCEL_ENV) return false;
  return process.env.NODE_ENV !== "production";
}

export function cookieSecure(): boolean {
  if (process.env.VERCEL_ENV) return true;
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Pepper for code hashes. Required on any deployed environment. */
export function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (!allowDevCodeLog()) {
    throw new Error("Sign-in is not configured. Set AUTH_SECRET.");
  }
  return DEV_AUTH_SECRET;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254) return null;
  if (email.includes(" ") || email.includes("\n") || email.includes("\0")) return null;
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return null;
  const domain = email.slice(at + 1);
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** scrypt so a database copy does not reveal the 6-digit code. */
export function hashLoginCode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(codeMaterial(code), salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function loginCodeMatches(code: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  const expected = parts[2];
  if (!salt || !/^[0-9a-f]+$/i.test(expected)) return false;
  const actual = scryptSync(codeMaterial(code), salt, 32);
  const prev = Buffer.from(expected, "hex");
  if (actual.length !== prev.length) return false;
  return timingSafeEqual(actual, prev);
}

function codeMaterial(code: string): string {
  return `${authSecret()}:${code}`;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function sixDigitCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}
