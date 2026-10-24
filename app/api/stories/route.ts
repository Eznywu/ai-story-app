import { prisma } from "@/lib/prisma";
import type { StoryCreateInput } from "@/lib/types";
import { getErrorMessage } from "@/lib/errors";
import { captureException } from "@/lib/monitoring";
import { parseChildGenderFromClient } from "@/lib/profiles/childGender";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { removeStoryAudioFile, removeStoryMediaFiles } from "@/lib/audio/storyMediaFiles";
import { findOwnedStory } from "@/lib/auth/ownedStory";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withMedia<T extends { posterFilename: string | null; audioFilename: string | null }>(row: T) {
  const { posterFilename, audioFilename, ...rest } = row;
  return {
    ...rest,
    posterFilename,
    audioFilename,
    posterUrl: posterFilename ? `/api/posters/${encodeURIComponent(posterFilename)}` : null,
    audioUrl: audioFilename ? `/api/audio/${encodeURIComponent(audioFilename)}` : null,
  };
}

function displayTitle(titleInput: string, mainCharacterName: string | null) {
  if (titleInput) return titleInput;
  if (mainCharacterName) return `${mainCharacterName}'s bedtime story`;
  return "Untitled Story";
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const stories = await prisma.story.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
    });
    return jsonNoStore({ stories: stories.map(withMedia) });
  } catch (error: unknown) {
    captureException(error, { route: "GET /api/stories" });
    console.error("[GET /api/stories] failed", getErrorMessage(error, "unknown error"));
    return jsonNoStore(
      { error: "We couldn't load your stories right now. Please try again." },
      500
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as StoryCreateInput;

    const titleInput = String(body.title ?? "").trim();
    const genre = String(body.genre ?? "").trim();
    const length = String(body.length ?? "").trim();
    const text = String(body.text ?? body.story ?? "").trim();
    const age = body.age ? String(body.age).trim() : null;
    const language = body.language ? String(body.language).trim() : null;
    const mainCharacterName = body.mainCharacterName
      ? String(body.mainCharacterName).trim()
      : null;
    const childGender = parseChildGenderFromClient(body.childGender);

    if (!genre || !length || !text) {
      return jsonNoStore(
        { error: "Missing fields: genre, length, and text/story are required" },
        400
      );
    }

    const title = displayTitle(titleInput, mainCharacterName);
    const requestedId = typeof body.id === "string" ? body.id.trim() : "";

    if (requestedId) {
      if (!isSafeStoryId(requestedId)) {
        return jsonNoStore({ error: "That story id is not valid." }, 400);
      }
      const existing = await findOwnedStory(auth.user.id, requestedId);
      if (!existing) {
        return jsonNoStore(
          { error: "That story is no longer in your library. Generate it again to save a new copy." },
          404
        );
      }
      const textChanged = existing.text !== text;
      if (textChanged && existing.audioFilename) {
        await removeStoryAudioFile(existing.audioFilename);
      }
      const story = await prisma.story.update({
        where: { id: requestedId },
        data: {
          title,
          genre,
          length,
          text,
          age,
          language,
          mainCharacterName,
          childGender,
          ...(textChanged ? { audioFilename: null } : {}),
        },
      });
      return jsonNoStore({ story: withMedia(story) });
    }

    const story = await prisma.story.create({
      data: {
        userId: auth.user.id,
        title,
        genre,
        length,
        text,
        age,
        language,
        mainCharacterName,
        childGender,
      },
    });

    return jsonNoStore({ story: withMedia(story) });
  } catch (error: unknown) {
    return jsonNoStore({ error: getErrorMessage(error, "Failed to save story") }, 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim() || "";
    if (!id || !isSafeStoryId(id)) {
      return jsonNoStore({ error: "Missing story id" }, 400);
    }
    const existing = await findOwnedStory(auth.user.id, id);
    if (!existing) {
      return jsonNoStore({ error: "Story not found." }, 404);
    }
    await removeStoryMediaFiles(existing);
    await prisma.story.delete({ where: { id } });
    return jsonNoStore({ ok: true });
  } catch (error: unknown) {
    return jsonNoStore({ error: getErrorMessage(error, "Failed to delete story") }, 500);
  }
}
