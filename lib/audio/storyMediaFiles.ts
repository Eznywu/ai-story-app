import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { isSafeStoryId } from "@/lib/stories/storyIds";

function audioFilenameFor(storyId: string) {
  return `audio_${storyId}.mp3`;
}

function isSafeAudioFilename(filename: string) {
  return /^audio_[a-z0-9]+\.mp3$/i.test(filename);
}

function isSafePosterFilename(filename: string) {
  return /^poster_[a-z0-9]+\.png$/i.test(filename);
}

async function unlinkUpload(folder: "audio" | "posters", filename: string | null | undefined) {
  if (!filename) return;
  const safe =
    folder === "audio" ? isSafeAudioFilename(filename) : isSafePosterFilename(filename);
  if (!safe || filename.includes("..") || filename.includes("/") || filename.includes("\\")) return;
  const filePath = path.join(process.cwd(), "uploads", folder, filename);
  await fs.unlink(filePath).catch(() => {});
}

export function storyAudioPublicUrl(filename: string) {
  return `/api/audio/${encodeURIComponent(filename)}`;
}

/** Overwrites this story's MP3 and stores the filename on the row. */
export async function saveStoryAudioFile(storyId: string, audio: Buffer): Promise<string> {
  if (!isSafeStoryId(storyId)) {
    throw new Error("Invalid story id");
  }
  if (!audio.length) {
    throw new Error("Empty audio");
  }
  const filename = audioFilenameFor(storyId);
  const dir = path.join(process.cwd(), "uploads", "audio");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), audio);
  await prisma.story.update({
    where: { id: storyId },
    data: { audioFilename: filename },
  });
  return storyAudioPublicUrl(filename);
}

export async function removeStoryMediaFiles(story: {
  audioFilename?: string | null;
  posterFilename?: string | null;
}) {
  await unlinkUpload("audio", story.audioFilename);
  await unlinkUpload("posters", story.posterFilename);
}

export async function removeStoryAudioFile(filename: string | null | undefined) {
  await unlinkUpload("audio", filename);
}
