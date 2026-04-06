const FALLBACK_TITLE = "Sample bedtime story";
const FALLBACK_STORY = `小星星在夜空中眨著眼睛，風輕輕吹過窗簾。小兔子嚕嚕抱著柔軟的小被子，聽著媽媽溫柔的聲音，慢慢閉上眼睛。世界變得又輕又安靜，像一片溫暖的雲。今晚的夢裡，會有一條灑滿月光的小路，通往甜甜的夢鄉。晚安，小寶貝。`;

export function getDefaultStoryTitle(): string {
  const t = process.env.DEFAULT_STORY_TITLE?.trim();
  return t || FALLBACK_TITLE;
}

export function getDefaultStoryText(): string {
  const t = process.env.DEFAULT_STORY_TEXT?.trim();
  return t || FALLBACK_STORY;
}

/** Normalize for comparing TTS request text to the configured default story. */
export function normalizeStoryTextForCompare(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function isDefaultStoryText(text: string): boolean {
  const a = normalizeStoryTextForCompare(text);
  const b = normalizeStoryTextForCompare(getDefaultStoryText());
  return a.length > 0 && a === b;
}
