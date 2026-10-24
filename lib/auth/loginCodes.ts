import { prisma } from "@/lib/prisma";
import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MS,
  SEND_EMAIL_LIMIT,
  SEND_EMAIL_WINDOW_MS,
  SEND_IP_LIMIT,
  SEND_IP_WINDOW_MS,
  SEND_MIN_INTERVAL_MS,
  hashLoginCode,
  loginCodeMatches,
  sixDigitCode,
} from "@/lib/auth/config";
import { deliverLoginCode, emailDeliveryProblem } from "@/lib/auth/sendLoginEmail";
import { createSession } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/session";

export type SendCodeResult =
  | { ok: true; cooldownSeconds: number }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number };

export type VerifyCodeResult =
  | { ok: true; token: string; user: AuthUser }
  | { ok: false; status: number; error: string };

export async function sendLoginCode(email: string, ip: string): Promise<SendCodeResult> {
  const deliveryError = emailDeliveryProblem();
  if (deliveryError) {
    return { ok: false, status: 503, error: deliveryError };
  }

  try {
    const now = Date.now();
    const hourAgo = new Date(now - SEND_EMAIL_WINDOW_MS);
    const ipWindow = new Date(now - SEND_IP_WINDOW_MS);

    const [recentForEmail, recentForIp, latest] = await Promise.all([
      prisma.loginCode.count({ where: { email, createdAt: { gt: hourAgo } } }),
      prisma.loginCode.count({ where: { ip, createdAt: { gt: ipWindow } } }),
      prisma.loginCode.findFirst({
        where: { email },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    if (latest) {
      const elapsed = now - latest.createdAt.getTime();
      if (elapsed < SEND_MIN_INTERVAL_MS) {
        const retryAfterSeconds = Math.ceil((SEND_MIN_INTERVAL_MS - elapsed) / 1000);
        return {
          ok: false,
          status: 429,
          error: `Wait ${retryAfterSeconds}s before sending another code.`,
          retryAfterSeconds,
        };
      }
    }

    if (recentForEmail >= SEND_EMAIL_LIMIT || recentForIp >= SEND_IP_LIMIT) {
      return {
        ok: false,
        status: 429,
        error: "Too many codes were requested. Wait a few minutes and try again.",
        retryAfterSeconds: 60,
      };
    }

    const code = sixDigitCode();
    const codeHash = hashLoginCode(code);
    const expiresAt = new Date(now + CODE_TTL_MS);

    const created = await prisma.$transaction(async (tx) => {
      await tx.loginCode.updateMany({
        where: { email, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      return tx.loginCode.create({
        data: { email, codeHash, expiresAt, ip },
      });
    });

    try {
      await deliverLoginCode(email, code);
    } catch (error) {
      await prisma.loginCode.delete({ where: { id: created.id } }).catch(() => {});
      const message = error instanceof Error ? error.message : "We couldn't send the email.";
      const status = message.includes("not configured") ? 503 : 502;
      return { ok: false, status, error: message };
    }

    await prisma.loginCode
      .deleteMany({ where: { expiresAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } } })
      .catch(() => {});

    return { ok: true, cooldownSeconds: Math.ceil(SEND_MIN_INTERVAL_MS / 1000) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "We couldn't send a code.";
    if (message.includes("AUTH_SECRET") || message.includes("not configured")) {
      return { ok: false, status: 503, error: message };
    }
    console.error("[auth] send login code failed", message);
    return { ok: false, status: 500, error: "We couldn't send a code. Try again." };
  }
}

export async function verifyLoginCode(email: string, code: string): Promise<VerifyCodeResult> {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) {
    return { ok: false, status: 400, error: "Enter the 6-digit code from the email." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.loginCode.findFirst({
        where: {
          email,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!row) {
        return { ok: false as const, status: 401, error: "That code is incorrect or expired." };
      }

      if (row.attempts >= CODE_MAX_ATTEMPTS) {
        await tx.loginCode.update({
          where: { id: row.id },
          data: { consumedAt: new Date() },
        });
        return {
          ok: false as const,
          status: 401,
          error: "Too many tries. Request a new code.",
        };
      }

      if (!loginCodeMatches(digits, row.codeHash)) {
        const attempts = row.attempts + 1;
        await tx.loginCode.update({
          where: { id: row.id },
          data: {
            attempts,
            ...(attempts >= CODE_MAX_ATTEMPTS ? { consumedAt: new Date() } : {}),
          },
        });
        return {
          ok: false as const,
          status: 401,
          error:
            attempts >= CODE_MAX_ATTEMPTS
              ? "Too many tries. Request a new code."
              : "That code is incorrect or expired.",
        };
      }

      await tx.loginCode.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });

      const user = await tx.user.upsert({
        where: { email },
        create: { email },
        update: {},
        select: { id: true, email: true },
      });

      return { ok: true as const, user };
    });

    if (!result.ok) return result;

    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
    const token = await createSession(result.user.id);
    return { ok: true, token, user: result.user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "We couldn't check that code.";
    if (message.includes("AUTH_SECRET") || message.includes("not configured")) {
      return { ok: false, status: 503, error: message };
    }
    console.error("[auth] verify login code failed", message);
    return { ok: false, status: 500, error: "We couldn't check that code. Try again." };
  }
}
