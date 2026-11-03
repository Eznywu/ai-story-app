import { randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";
import type { Page } from "@playwright/test";
import { hashSessionToken } from "../../../lib/auth/config";

/** Seed a normal signed-in session in a disposable local database, never an app bypass. */
export async function signInRecordingParent(page: Page): Promise<string> {
  const url = new URL(process.env.DATABASE_URL || "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.endsWith("_test")) {
    throw new Error("Recording browser tests require a disposable local DATABASE_URL ending in _test.");
  }
  const token = randomBytes(32).toString("base64url");
  const client = new Client({ connectionString: url.toString() });
  let userId: string;
  await client.connect();
  try {
    const result = await client.query<{ id: string }>(
      'INSERT INTO "User" (id, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id',
      [randomUUID(), "recording-browser-test@example.invalid"]
    );
    userId = result.rows[0].id;
    await client.query('DELETE FROM "Session" WHERE "userId" = $1', [userId]);
    await client.query('INSERT INTO "Session" (id, "userId", "tokenHash", "expiresAt") VALUES ($1, $2, $3, $4)', [
      randomUUID(), userId, hashSessionToken(token), new Date(Date.now() + 3_600_000),
    ]);
  } finally {
    await client.end();
  }
  await page.context().addCookies([{ name: "hh_session", value: token, url: "http://127.0.0.1:3456", httpOnly: true, sameSite: "Lax" }]);
  const session = await page.request.get("/api/auth/session");
  if (!session.ok() || (await session.json()).user?.id !== userId) {
    throw new Error("The normal signed-in test session was not accepted.");
  }
  return userId;
}
