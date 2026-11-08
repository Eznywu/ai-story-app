import { prisma } from "@/lib/prisma";
import { deleteMediaReference, deleteReplacedMedia, saveMediaBytes } from "@/lib/media/objectStore";
import { isSafeStoryId } from "@/lib/stories/storyIds";

function audioFilenameFor(storyId: string) {
  return `audio_${storyId}${Date.now().toString(36)}.mp3`;
}

export function storyAudioPublicUrl(filename: string) {
  return `/api/audio/${encodeURIComponent(filename)}`;
}

export type StoryAudioIdentity = {
  modelId: string;
  voiceId: string;
  voiceSettings: Record<string, string | number | boolean | null>;
  language: string;
  dictionaryVersion: string;
  configVersion: string;
  configId: string;
  cacheKey: string;
  privateAccess?: boolean;
  voiceKind?: string | null;
  voiceVersion?: number | null;
};

/** Story columns that describe the saved recording. Cleared together when the recording is removed. */
export const CLEARED_STORY_AUDIO = {
  audioFilename: null,
  audioUrl: null,
  audioStorageUrl: null,
  audioPrivate: false,
  audioCacheKey: null,
} as const;

/** Saves a new MP3, then drops the previous file. Call this only after the new audio passed its checks. */
export async function saveStoryAudioFile(
  storyId: string,
  audio: Buffer,
  identity?: StoryAudioIdentity
): Promise<string> {
  if (!isSafeStoryId(storyId)) {
    throw new Error("Invalid story id");
  }
  const previous = await prisma.story.findUnique({
    where: { id: storyId },
    select: { audioFilename: true, audioUrl: true, audioStorageUrl: true },
  });
  const filename = audioFilenameFor(storyId);
  const isPrivate = Boolean(identity?.privateAccess);
  const saved = await saveMediaBytes({
    folder: "audio",
    filename,
    body: audio,
    contentType: "audio/mpeg",
    access: isPrivate ? "private" : "public",
  });
  const playbackUrl = isPrivate ? storyAudioPublicUrl(filename) : saved.url;
  await prisma.story.update({
    where: { id: storyId },
    data: {
      audioFilename: filename,
      audioUrl: playbackUrl,
      audioPrivate: isPrivate,
      audioStorageUrl: isPrivate && saved.url.startsWith("http") ? saved.url : null,
      ...(identity
        ? {
            audioModelId: identity.modelId,
            audioVoiceId: identity.voiceId,
            audioVoiceSettings: identity.voiceSettings,
            audioLanguage: identity.language,
            audioDictionaryVersion: identity.dictionaryVersion,
            audioConfigVersion: identity.configVersion,
            audioConfigId: identity.configId,
            audioCacheKey: identity.cacheKey,
            audioVoiceKind: identity.voiceKind ?? null,
            audioVoiceVersion: identity.voiceVersion ?? null,
          }
        : {}),
    },
  });
  if (previous?.audioFilename && previous.audioFilename !== filename) {
    await deleteReplacedMedia({
      folder: "audio",
      filename: previous.audioFilename,
      url: previous.audioUrl,
      storageUrl: previous.audioStorageUrl,
    });
  }
  return playbackUrl;
}

type StoryAudioRef = {
  audioFilename?: string | null;
  audioUrl?: string | null;
  audioStorageUrl?: string | null;
};

/** Deletes every stored copy of a story's media. Throws if a copy could not be deleted. */
export async function removeStoryMediaFiles(
  story: StoryAudioRef & {
    posterFilename?: string | null;
    posterUrl?: string | null;
    illustrationFilename?: string | null;
    illustrationUrl?: string | null;
    coverFilename?: string | null;
    coverUrl?: string | null;
  }
) {
  await removeStoryAudioFile(story);
  await deleteMediaReference({ folder: "posters", filename: story.posterFilename, url: story.posterUrl });
  await deleteMediaReference({ folder: "posters", filename: story.illustrationFilename, url: story.illustrationUrl });
  await deleteMediaReference({ folder: "posters", filename: story.coverFilename, url: story.coverUrl });
}

/** Personal-voice recordings live at `audioStorageUrl`; `audioUrl` is only the app route that streams them. */
export async function removeStoryAudioFile(story: StoryAudioRef) {
  await deleteMediaReference({
    folder: "audio",
    filename: story.audioFilename,
    url: story.audioUrl,
    storageUrl: story.audioStorageUrl,
  });
}
