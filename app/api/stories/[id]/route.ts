import { findOwnedStory } from "@/lib/auth/ownedStory";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { getErrorMessage } from "@/lib/errors";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { storyReaderPayload } from "@/lib/stories/storyReaderPayload";

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
    return jsonNoStore(storyReaderPayload(story));
  } catch (error: unknown) {
    return jsonNoStore({ error: getErrorMessage(error, "Could not load that story.") }, 500);
  }
}
