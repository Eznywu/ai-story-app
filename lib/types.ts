export type StoryLength = "short" | "medium" | "long";

export type StoryDTO = {
  id: string;
  title: string;
  genre: string;
  length: StoryLength | string;
  text: string;
  age: string | null;
  language: string | null;
  mainCharacterName: string | null;
  childGender: string | null;
  createdAt: string;
  /** Present when a poster PNG was saved for this story. */
  posterUrl?: string | null;
};

/** Max length for optional story guidance; enforced in `lib/storyGenerator.ts`. */
export const STORY_INPUT_MAX_CHARS = 360;

export type StoryCreateInput = {
  title?: string;
  genre?: string;
  length?: StoryLength | string;
  text?: string;
  story?: string;
  age?: string;
  language?: string;
  mainCharacterName?: string;
  childGender?: string;
};

export type StoryGenerationInput = {
  age?: string;
  language?: string;
  mainCharacterName?: string;
  childGender?: string;
  genre?: string;
  length?: StoryLength | string;
  title?: string;
  /** Optional guidance for the model (max {@link STORY_INPUT_MAX_CHARS} characters). */
  storyInput?: string;
};

export type VoiceOption = {
  id: string;
  name: string;
  language: string;
  provider: "elevenlabs";
  voiceId: string;
  isDefault?: boolean;
};

/** Global action banner on home (story / save / TTS / poster). */
export type AppBannerSource = "story" | "save" | "tts" | "poster";

export type AppBannerError = {
  source: AppBannerSource;
  message: string;
};
