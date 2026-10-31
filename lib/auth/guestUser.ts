import type { Prisma } from "@/generated/prisma/client";
import { GUEST_EMAIL } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth/session";

/** One stable account for every request while `AUTH_ENABLED` is off. */
export async function getOrCreateGuestUser(): Promise<AuthUser> {
  const existing = await prisma.user.findUnique({
    where: { email: GUEST_EMAIL },
    select: { id: true, email: true },
  });
  if (existing) return existing;

  try {
    return await prisma.user.create({
      data: { email: GUEST_EMAIL },
      select: { id: true, email: true },
    });
  } catch (error) {
    const again = await prisma.user.findUnique({
      where: { email: GUEST_EMAIL },
      select: { id: true, email: true },
    });
    if (again) return again;
    throw error;
  }
}

/**
 * Move the paused-login library onto the first real parent account that signs in
 * with an empty library. Later accounts are left alone. Rows are reassigned, not copied
 * or deleted, so turning login on does not drop stories made as the guest.
 */
export async function adoptGuestLibrary(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const guest = await tx.user.findUnique({
    where: { email: GUEST_EMAIL },
    select: { id: true },
  });
  if (!guest || guest.id === userId) return;

  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${guest.id} FOR UPDATE`;

  const [stories, kids, characters, voices, stats] = await Promise.all([
    tx.story.count({ where: { userId } }),
    tx.kidProfile.count({ where: { userId } }),
    tx.storyCharacter.count({ where: { userId } }),
    tx.voice.count({ where: { userId } }),
    tx.readingStats.findUnique({ where: { userId }, select: { userId: true } }),
  ]);
  if (stories || kids || characters || voices || stats) return;

  await tx.story.updateMany({ where: { userId: guest.id }, data: { userId } });
  await tx.kidProfile.updateMany({ where: { userId: guest.id }, data: { userId } });
  await tx.storyCharacter.updateMany({ where: { userId: guest.id }, data: { userId } });
  await tx.voice.updateMany({ where: { userId: guest.id }, data: { userId } });

  const guestStats = await tx.readingStats.findUnique({ where: { userId: guest.id } });
  if (!guestStats) return;

  await tx.readingStats.delete({ where: { userId: guest.id } });
  await tx.readingStats.create({
    data: {
      userId,
      todayKey: guestStats.todayKey,
      storiesReadToday: guestStats.storiesReadToday,
      streakDays: guestStats.streakDays,
      lastReadDayKey: guestStats.lastReadDayKey,
      lastStoryId: guestStats.lastStoryId,
      lastStoryTitle: guestStats.lastStoryTitle,
      draftSummary: guestStats.draftSummary,
    },
  });
}
