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
  /** True when created by `lib/stories/dailyAutomatedStories.ts` (Home "New Release"). */
  dailyAutomated?: boolean;
  /** Present when a poster PNG was saved for this story. */
  posterUrl?: string | null;
  coverUrl?: string | null;
  illustrationUrl?: string | null;
  artworkStatus?: string | null;
  posterCaption?: string | null;
  dedication?: string | null;
  /** Present when narration MP3 was saved for this story. */
  audioUrl?: string | null;
};

/** Max length for optional story guidance; enforced in `lib/stories/storyGenerator.ts`. */
export const STORY_INPUT_MAX_CHARS = 360;

/** Upper bound for a saved story and for one narration request. A long story is about 10,000 characters. */
export const STORY_TEXT_MAX_CHARS = 20_000;

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
  /** When set, update this saved story instead of creating another row. */
  id?: string;
  characterId?: string | null;
  characterSnapshot?: StoryGenerationInput["character"];
  visualBrief?: StoryVisualBrief | null;
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
  /** Selected character, kept apart from the listener's age. */
  character?: {
    id?: string | null;
    version?: string | null;
    name?: string | null;
    type?: string | null;
    characterAge?: string | null;
    visualStyle?: string | null;
    referenceImageUrl?: string | null;
    appearance?: {
      colours?: string;
      proportions?: string;
      clothing?: string;
      accessories?: string;
    } | null;
  };
};

export type StoryVisualBrief = {
  version: number;
  moment: string;
  protagonist: string;
  setting: string;
  action: string;
  emotion: string;
  props: string[];
  composition: string;
  ageBand: string;
  genre: string;
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
