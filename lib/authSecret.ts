import { createHash } from "crypto";

export function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") {
    return createHash("sha256").update("dev-insecure-auth-secret").digest("hex");
  }
  throw new Error("AUTH_SECRET must be set (at least 16 characters) in production.");
}
