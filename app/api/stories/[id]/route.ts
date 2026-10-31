import { findOwnedStory } from "@/lib/auth/ownedStory";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { getErrorMessage } from "@/lib/errors";
import { isSafeStoryId } from "@/lib/stories/storyIds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const storyId = id?.trim() || "";
    if (!isSafeStoryId(storyId)) {
      return jsonNoStore({ error: "That story id is not valid." }, 400);
    }
    const story = await findOwnedStory(auth.user.id, storyId);
    if (!story) {
      return jsonNoStore({ error: "Story not found." }, 404);
    }
    return jsonNoStore({
      story: {
        ...story,
        createdAt: story.createdAt.toISOString(),
        posterUrl:
          story.posterUrl?.trim() ||
          (story.posterFilename ? `/api/posters/${encodeURIComponent(story.posterFilename)}` : null),
        audioUrl:
          story.audioUrl?.trim() ||
          (story.audioFilename ? `/api/audio/${encodeURIComponent(story.audioFilename)}` : null),
      },
    });
  } catch (error: unknown) {
    return jsonNoStore({ error: getErrorMessage(error, "Could not load that story.") }, 500);
  }
}
