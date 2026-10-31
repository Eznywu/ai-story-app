import { NextResponse } from "next/server";
import { getCurrentUser, type AuthUser } from "@/lib/auth/session";

export function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function unauthorized() {
  return jsonNoStore({ error: "Sign in to continue." }, 401);
}

export async function requireUser(): Promise<
  { user: AuthUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  return { user };
}
