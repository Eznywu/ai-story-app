import { findOwnedStory } from "@/lib/auth/ownedStory";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { getErrorMessage } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { markPosterSaved, posterListing } from "@/lib/stories/posterLibrary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * One saved poster per story and poster URL. A second save returns the same
 * timestamp and does not write another file or row.
 */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const storyId = id?.trim() || "";
    if (!isSafeStoryId(storyId)) {
      return jsonNoStore({ error: "That story id is not valid." }, 400);
    }
    const story = await findOwnedStory(auth.user.id, storyId);
    if (!story) return jsonNoStore({ error: "Story not found." }, 404);
    const posterUrl = story.posterUrl?.trim() || "";
    if (!posterUrl) {
      return jsonNoStore({ error: "The poster isn't ready yet." }, 409);
    }
    const saved = markPosterSaved(story.artworkMeta, {
      storyId,
      posterUrl,
      savedAt: new Date().toISOString(),
    });
    if (!saved.alreadySaved) {
      await prisma.story.update({
        where: { id: story.id },
        data: { artworkMeta: saved.meta as Prisma.InputJsonValue },
      });
    }
    const listing = posterListing({ posterUrl, artworkMeta: saved.meta });
    return jsonNoStore({
      posterSaved: listing.inLibrary,
      posterSavedAt: listing.savedAt,
      alreadySaved: saved.alreadySaved,
    });
  } catch (error: unknown) {
    return jsonNoStore({ error: getErrorMessage(error, "Could not save this poster.") }, 500);
  }
}
