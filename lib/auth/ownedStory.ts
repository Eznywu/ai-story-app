import { prisma } from "@/lib/prisma";
import { isSafeStoryId } from "@/lib/stories/storyIds";

export async function findOwnedStory(userId: string, storyId: string) {
  if (!isSafeStoryId(storyId)) return null;
  return prisma.story.findFirst({ where: { id: storyId, userId } });
}

/** True when one of this user's stories uses the picture file. */
export async function userOwnsPicture(userId: string, filename: string): Promise<boolean> {
  const story = await prisma.story.findFirst({
    where: {
      userId,
      OR: [{ posterFilename: filename }, { illustrationFilename: filename }, { coverFilename: filename }],
    },
    select: { id: true },
  });
  return Boolean(story);
}
