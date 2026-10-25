import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  authEnabled,
  hashSessionToken,
  newSessionToken,
} from "@/lib/auth/config";
import { getOrCreateGuestUser } from "@/lib/auth/guestUser";

export type AuthUser = {
  id: string;
  email: string;
};

export async function readSessionToken(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value?.trim() ?? "";
  if (!token || token.length > 200) return null;
  return token;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!authEnabled()) {
    return getOrCreateGuestUser();
  }

  const token = await readSessionToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { id: session.user.id, email: session.user.email };
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });
  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  const token = await readSessionToken();
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}
