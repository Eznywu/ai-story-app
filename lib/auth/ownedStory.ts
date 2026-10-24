import { prisma } from "@/lib/prisma";
import { isSafeStoryId } from "@/lib/stories/storyIds";

export async function findOwnedStory(userId: string, storyId: string) {
  if (!isSafeStoryId(storyId)) return null;
  return prisma.story.findFirst({ where: { id: storyId, userId } });
}

export async function userOwnsMedia(
  userId: string,
  kind: "audio" | "poster",
  filename: string
): Promise<boolean> {
  const story = await prisma.story.findFirst({
    where:
      kind === "audio"
        ? { userId, audioFilename: filename }
        : { userId, posterFilename: filename },
    select: { id: true },
  });
  return Boolean(story);
}
