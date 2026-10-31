import fs from "fs";
import path from "path";

/**
 * Local stand-in for OpenAI / ElevenLabs / image providers.
 * Ignored on Vercel production so a stray env var cannot ship canned stories.
 */
export function mockProvidersEnabled(): boolean {
  if (process.env.MOCK_PROVIDERS !== "1") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

/** Forces `/api/poster` to fail like a provider outage so the text-only poster fallback runs. */
export function mockPosterFallbackEnabled(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.MOCK_POSTER_MODE === "fallback";
}

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

export function mockPosterPngBuffer(): Buffer {
  return Buffer.from(PNG_1X1);
}

let cachedMp3: Buffer | null = null;

export function mockNarrationMp3Buffer(): Buffer {
  if (!cachedMp3) {
    cachedMp3 = fs.readFileSync(
      path.join(process.cwd(), "lib/providers/fixtures/mock-narration.mp3")
    );
  }
  return Buffer.from(cachedMp3);
}

export function mockStoryText(input: {
  mainCharacterName: string;
  genre: string;
  language: string;
  storyInput: string;
  age: string;
  length: string;
}): string {
  const name = input.mainCharacterName.trim() || "Lulu";
  const genre = input.genre.trim() || "bedtime";
  const guidance = input.storyInput.trim();
  const guidanceLine = guidance ? ` Caregiver note: ${guidance.slice(0, 160)}` : "";
  const isZh = input.language.toLowerCase().includes("zh");
  if (isZh) {
    return [
      `夜晚安靜下來，${name} 想聽一個關於${genre}的故事。${guidanceLine}`.trim(),
      `${name} 把被子拉好，跟著慢慢的呼吸，一下、兩下，肩膀鬆下來。`,
      `故事裡有小小的${genre}，不吵也不急，只陪著 ${input.age} 的 ${name}。`,
      `最後一句落在枕邊：晚安，${name}。`,
    ].join("\n");
  }
  return [
    `${name} asked for a gentle ${genre.toLowerCase()} story for a ${input.age} listener.${guidanceLine}`.trim(),
    `The night light stayed warm. ${name} counted slow breaths until the day grew small.`,
    `This ${input.length} tale kept the ${genre.toLowerCase()} moments soft, with no hurry and no scare.`,
    `Goodnight, ${name}. The room held still, and sleep knew the way home.`,
  ].join("\n");
}
