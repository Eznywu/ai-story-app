import { prisma } from "@/lib/prisma";
import { deleteMediaReference, saveMediaBytes } from "@/lib/media/objectStore";
import { isSafeStoryId } from "@/lib/stories/storyIds";

function versionStamp() {
  return Date.now().toString(36);
}

function audioFilenameFor(storyId: string) {
  return `audio_${storyId}${versionStamp()}.mp3`;
}

function posterFilenameFor(storyId: string) {
  return `poster_${storyId}${versionStamp()}.png`;
}

export function storyAudioPublicUrl(filename: string) {
  return `/api/audio/${encodeURIComponent(filename)}`;
}

/** Overwrites this story's MP3 and stores the playback URL on the row. */
export async function saveStoryAudioFile(storyId: string, audio: Buffer): Promise<string> {
  if (!isSafeStoryId(storyId)) {
    throw new Error("Invalid story id");
  }
  const previous = await prisma.story.findUnique({
    where: { id: storyId },
    select: { audioFilename: true, audioUrl: true },
  });
  const filename = audioFilenameFor(storyId);
  const saved = await saveMediaBytes({
    folder: "audio",
    filename,
    body: audio,
    contentType: "audio/mpeg",
  });
  await prisma.story.update({
    where: { id: storyId },
    data: { audioFilename: filename, audioUrl: saved.url },
  });
  if (previous?.audioFilename && previous.audioFilename !== filename) {
    await deleteMediaReference({
      folder: "audio",
      filename: previous.audioFilename,
      url: previous.audioUrl,
    });
  }
  return saved.url;
}

/** Overwrites this story's poster PNG and stores the image URL on the row. */
export async function saveStoryPosterFile(storyId: string, png: Buffer): Promise<string> {
  if (!isSafeStoryId(storyId)) {
    throw new Error("Invalid story id");
  }
  const previous = await prisma.story.findUnique({
    where: { id: storyId },
    select: { posterFilename: true, posterUrl: true },
  });
  const filename = posterFilenameFor(storyId);
  const saved = await saveMediaBytes({
    folder: "posters",
    filename,
    body: png,
    contentType: "image/png",
  });
  await prisma.story.update({
    where: { id: storyId },
    data: { posterFilename: filename, posterUrl: saved.url },
  });
  if (previous?.posterFilename && previous.posterFilename !== filename) {
    await deleteMediaReference({
      folder: "posters",
      filename: previous.posterFilename,
      url: previous.posterUrl,
    });
  }
  return saved.url;
}

export async function removeStoryMediaFiles(story: {
  audioFilename?: string | null;
  audioUrl?: string | null;
  posterFilename?: string | null;
  posterUrl?: string | null;
}) {
  await deleteMediaReference({
    folder: "audio",
    filename: story.audioFilename,
    url: story.audioUrl,
  });
  await deleteMediaReference({
    folder: "posters",
    filename: story.posterFilename,
    url: story.posterUrl,
  });
}

export async function removeStoryAudioFile(story: {
  audioFilename?: string | null;
  audioUrl?: string | null;
}) {
  await deleteMediaReference({
    folder: "audio",
    filename: story.audioFilename,
    url: story.audioUrl,
  });
}
