import { createHmac, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/authSecret";

export const SESSION_COOKIE = "es_story_session";

export type SessionPayload = {
  /** email or stable id */
  sub: string;
  /** 1 = membership active */
  m: 0 | 1;
  /** unix seconds */
  exp: number;
};

const MAX_AGE_SEC = 60 * 60 * 24 * 30;

function encode(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf8").toString("base64url");
  const secret = getAuthSecret();
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function signSession(payload: Omit<SessionPayload, "exp"> & { exp?: number }): string {
  const exp = payload.exp ?? Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  return encode({ sub: payload.sub, m: payload.m, exp });
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;
  const secret = getAuthSecret();
  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const p = JSON.parse(raw) as SessionPayload;
    if (typeof p.sub !== "string" || !p.sub.trim()) return null;
    if (p.m !== 0 && p.m !== 1) return null;
    if (typeof p.exp !== "number" || !Number.isFinite(p.exp)) return null;
    if (Date.now() / 1000 > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

export function parseSessionCookie(cookieHeader: string | null): SessionPayload | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== SESSION_COOKIE) continue;
    const value = rest.join("=").trim();
    if (!value) return null;
    return verifySessionToken(decodeURIComponent(value));
  }
  return null;
}

export function getSessionFromRequest(req: Request): SessionPayload | null {
  return parseSessionCookie(req.headers.get("cookie"));
}

export function sessionCookieHeaderValue(token: string): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SEC}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function appendSessionCookie(res: NextResponse, token: string) {
  res.headers.append("Set-Cookie", sessionCookieHeaderValue(token));
}

export function appendClearSessionCookie(res: NextResponse) {
  res.headers.append("Set-Cookie", clearSessionCookieHeader());
}
