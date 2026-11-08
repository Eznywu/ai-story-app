import { randomBytes } from "node:crypto";
import OpenAI from "openai";
import type { StoryGenerationInput } from "@/lib/types";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import { createError, getErrorMessage } from "@/lib/errors";
import { getOpenAiBaseUrl, getPosterHttpDispatcher } from "@/lib/providerHttp";
import { providerTimeoutMs } from "@/lib/vercelDuration";
import { posterProviderTransportFailureMessage } from "@/lib/posters/posterProviderErrors";
import { loadAntiRepeatLibraryContext } from "@/lib/stories/storyLibraryContext";
import { normalizeChildGenderForStoryInput } from "@/lib/profiles/childGender";
import { mockProvidersEnabled, mockStoryText } from "@/lib/providers/mockProviders";
import { parseAudienceAge } from "@/lib/posters/audienceAge";
import { buildCharacterSnapshot, type CharacterSnapshot } from "@/lib/posters/characterSnapshot";
import {
  deriveVisualBrief,
  splitStoryAndBrief,
  visualBriefInstructions,
  type VisualBrief,
} from "@/lib/posters/visualBrief";

export function lengthHint(length: string) {
  if (length === "short") return "about 250-400 words";
  if (length === "medium") return "about 700-900 words";
  return "about 1200-1600 words";
}

export function normalizeStoryInput(body: StoryGenerationInput) {
  const childGender = normalizeChildGenderForStoryInput(body.childGender);
  return {
    genre: String(body.genre ?? "Animals"),
    length: String(body.length ?? "short"),
    age: String(body.age ?? "6 months"),
    language: String(body.language ?? "en"),
    mainCharacterName: String(body.mainCharacterName ?? "Lulu").trim(),
    childGender,
    title: String(body.title ?? "").trim(),
    storyInput: String(body.storyInput ?? "").trim(),
  };
}

export function validateStoryInput(input: ReturnType<typeof normalizeStoryInput>) {
  if (!input.mainCharacterName) {
    return "Main character name is required";
  }
  if (input.mainCharacterName.length > 60) {
    return "Main character name is too long";
  }
  if (input.title.length > 120) {
    return "Title is too long";
  }
  if (input.storyInput.length > STORY_INPUT_MAX_CHARS) {
    return "Story input is too long";
  }
  return null;
}

function genderHint(input: ReturnType<typeof normalizeStoryInput>) {
  if (input.childGender === "girl") return { en: "The main character is a girl.", zh: "主角是女孩。" };
  if (input.childGender === "boy") return { en: "The main character is a boy.", zh: "主角是男孩。" };
  if (input.childGender === "nonbinary") {
    return {
      en: "The listener may not fit a strict girl/boy framing: use warm, neutral language; avoid stereotypical gender roles.",
      zh: "聽故事的孩子可能不屬於傳統「女孩／男孩」框架：用溫暖、中性的說法，避免刻板性別角色。",
    };
  }
  return {
    en: "Use a gentle, inclusive tone; do not emphasize gender.",
    zh: "用溫柔、包容的語氣；不必刻意強調性別。",
  };
}

const VARIATION_NUDGES_EN = [
  "Place the calm action somewhere specific (porch swing, rainy window, garden path).",
  "Let a small kindly creature or object help once, without becoming loud or scary.",
  "Weave in one tiny bedtime ritual (slow counting, three deep breaths, a whispered rhyme).",
  "Use a different emotional arc than “walk → meet friend → sleep”; vary the middle.",
  "Start the journey from an ordinary evening detail (socks, toothbrushing, a night light).",
  "Include one fresh sensory detail (cinnamon, cool sheets, distant train, owl silhouette).",
  "Let the gentle tension be something very small (a misplaced toy, a cloud shape).",
  "End with a new comforting image, not the same moon-or-star cliché you used before.",
];

const VARIATION_NUDGES_ZH = [
  "把故事放在具體一點的場景：門廊搖椅、雨聲的窗、花園小徑其一即可。",
  "讓一個安靜的小動物或小物件輕輕幫忙一次，不要驚悚或大聲。",
  "自然融入小小的睡前儀式（慢慢數數、三個深呼吸、一句短短的押韻）。",
  "中段不要每次都「走一走 → 遇朋友 → 睡覺」，換一種溫和的節奏。",
  "從日常睡前細節開場（小拖鞋、刷牙、小夜燈擇一）。",
  "加入一個新鮮的感官細節（淡淡的皂香、涼涼的被單、遠處車聲、樹影）。",
  "温和的「小困難」可以很小（找不到小玩偶、雲的形狀變了）。",
  "結尾用新的安撫畫面，不要重複你常用月亮星星套句。",
];

function pickRandomSubset<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function storyFreshnessBlock(isZh: boolean, seed: string) {
  const nudges = pickRandomSubset(isZh ? VARIATION_NUDGES_ZH : VARIATION_NUDGES_EN, 3);
  if (isZh) {
    return [
      `【本次專用種子】${seed}（僅避免重複，不必寫進故事正文）。`,
      "請寫一篇與你之前輸出都**不同**的故事：新的場景、新的轉折或細節，避免套話與固定開頭。（請勿照搬你剛寫過的句子。）",
      `創意提示（可選擇性融入）：${nudges.join(" ")}`,
    ].join("\n");
  }
  return [
    `[Request-only freshness seed: ${seed} — do not mention this seed in the story.]`,
    "Write a story that is **not** a repeat of prior stories: change the setting, beats, or concrete details; avoid formulaic openings and boilerplate phrasing.",
    `Optional creative nudges (use if helpful): ${nudges.join(" ")}`,
  ].join("\n");
}

function libraryAntiRepeatBlock(
  isZh: boolean,
  libraryContext: string
): string {
  if (!libraryContext.trim()) return "";
  if (isZh) {
    return [
      "【與下列「已儲存」故事明顯區隔】",
      "請勿重複相近的情節走向、套話或結尾節奏；可以同類型，但場景、具體事件、感官細節必須換新，也不要照抄下列文字。",
      libraryContext,
    ].join("\n");
  }
  return [
    "[Differentiate from these stories already saved in this app.]",
    "Do not reuse a similar plot arc, repeated wording, or the same ending rhythm. Same genre is fine—but change setting, concrete events, and sensory details. Do not copy phrases below.",
    libraryContext,
  ].join("\n");
}

function characterBlock(character: CharacterSnapshot, isZh: boolean): string {
  if (isZh) {
    return [
      `選定角色：${character.name}，是「${character.type}」。`,
      character.characterAge ? `角色自己的年齡：${character.characterAge}。這和聽故事的孩子年齡是兩件事。` : "角色年齡未指定，不要把它改成聽故事的孩子。",
      `外觀：顏色 ${character.appearance.colours}；比例 ${character.appearance.proportions}；服裝 ${character.appearance.clothing}；配件 ${character.appearance.accessories}。`,
      "類型只改變場景、道具、光線和心情，不可把主角換成另一種生物。",
    ].join("\n");
  }
  return [
    `Selected character: ${character.name}, a ${character.type}.`,
    character.characterAge
      ? `The character's own age is ${character.characterAge}. That is separate from the listener's age.`
      : "The character's age is unspecified. Do not replace it with the listener's age.",
    `Appearance: colours ${character.appearance.colours}; proportions ${character.appearance.proportions}; clothing ${character.appearance.clothing}; accessories ${character.appearance.accessories}.`,
    "Genre may change the setting, props, light, and mood. It must not change the protagonist's species or identity.",
  ].join("\n");
}

export function buildStoryGenerationPrompt(
  input: ReturnType<typeof normalizeStoryInput>,
  freshnessSeed: string,
  libraryContext: string,
  character: CharacterSnapshot
) {
  const isZh = input.language.toLowerCase().includes("zh");
  const gh = genderHint(input);
  const freshness = storyFreshnessBlock(isZh, freshnessSeed);
  const libraryBlock = libraryAntiRepeatBlock(isZh, libraryContext);
  if (isZh) {
    return [
      `請用繁體中文寫一個適合 ${input.age} 寶寶聽的睡前故事。`,
      `主角名字叫「${input.mainCharacterName}」。`,
      gh.zh,
      `故事類型：${input.genre}。`,
      `長度：${lengthHint(input.length)}。`,
      input.title ? `（故事題名參考：「${input.title}」）` : "",
      input.storyInput
        ? `【使用者提供的方向（自然融入，不必逐句照抄）】${input.storyInput}`
        : "",
      "語氣：像真實的睡前說故事的人，溫柔、安撫、慢慢說。",
      "格式要求：不要用標題或條列；句子短一點；多用重複句式讓寶寶安心；最後一句要很溫柔地收尾。",
      characterBlock(character, true),
      visualBriefInstructions(true),
      libraryBlock,
      freshness,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Write a bedtime story for a ${input.age} child.`,
    `Main character name: "${input.mainCharacterName}".`,
    gh.en,
    `Genre: ${input.genre}.`,
    `Length: ${lengthHint(input.length)}.`,
    input.title ? `Title idea (optional): "${input.title}"` : "",
    input.storyInput
      ? `Caregiver guidance (weave in naturally; do not read as a checklist): ${input.storyInput}`
      : "",
    "Tone: gentle, soothing, like a real bedtime storyteller. Calm pacing.",
    "Constraints: no headings or bullet points, short sentences, comforting repetition, end with a soft final line.",
    characterBlock(character, false),
    visualBriefInstructions(false),
    libraryBlock,
    freshness,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Upper bound on output tokens: the requested word count plus the visual-brief JSON that follows
 * the story. A tighter cap cut long English stories off before the ending and the brief.
 */
function outputTokenHint(length: string) {
  if (length === "short") return 800;
  if (length === "medium") return 1600;
  return 2600;
}

/** Bad requests, auth, and content refusals fail the same way on a second paid try. */
function worthRetrying(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== "number") return true;
  return status === 408 || status === 429 || status >= 500;
}

export type GeneratedStory = {
  text: string;
  visualBrief: VisualBrief | null;
};

function characterFromRequest(body: StoryGenerationInput, name: string): CharacterSnapshot {
  const character = body.character;
  return buildCharacterSnapshot({
    id: character?.id,
    version: character?.version,
    name: character?.name || name,
    type: character?.type,
    characterAge: character?.characterAge,
    appearance: character?.appearance,
    visualStyle: character?.visualStyle,
    referenceImageUrl: character?.referenceImageUrl,
    childGender: body.childGender,
  });
}

/** Splits the story from its visual brief. A missing brief is derived locally; the model is not asked again. */
function withDerivedBrief(
  text: string,
  normalized: ReturnType<typeof normalizeStoryInput>,
  character: CharacterSnapshot
): GeneratedStory {
  const split = splitStoryAndBrief(text, parseAudienceAge(normalized.age).band);
  const story = split.story.trim();
  return {
    text: story,
    visualBrief:
      split.visualBrief ??
      (story
        ? deriveVisualBrief({
            title: normalized.title,
            story,
            genre: normalized.genre,
            age: normalized.age,
            character,
          })
        : null),
  };
}

export async function generateStoryWithRetry(
  body: StoryGenerationInput,
  opts?: {
    retries?: number;
    userId?: string | null;
    /** Test hook. Production leaves this unset and uses one model request. */
    complete?: (prompt: string) => Promise<string>;
  }
): Promise<GeneratedStory> {
  const normalized = normalizeStoryInput(body);
  const validationError = validateStoryInput(normalized);
  if (validationError) {
    throw createError(validationError, 400);
  }
  const character = characterFromRequest(body, normalized.mainCharacterName);

  if (mockProvidersEnabled() && !opts?.complete) {
    return withDerivedBrief(mockStoryText(normalized), normalized, character);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!opts?.complete && !apiKey) {
    throw createError(
      "Story generation needs an OpenAI API key. Set OPENAI_API_KEY and try again.",
      500
    );
  }

  const timeoutMs = providerTimeoutMs(Number(process.env.OPENAI_STORY_TIMEOUT_MS), 180_000);
  const client = opts?.complete
    ? null
    : new OpenAI({
        apiKey: apiKey ?? "",
        baseURL: getOpenAiBaseUrl(),
        timeout: timeoutMs,
        maxRetries: 0,
        fetchOptions: { dispatcher: getPosterHttpDispatcher(timeoutMs) },
      });
  const retries = Math.max(0, opts?.retries ?? 1);
  const models = (process.env.OPENAI_STORY_MODELS ?? "gpt-4o-mini")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const parsedTemp = Number(process.env.OPENAI_STORY_TEMPERATURE);
  const temperature = Number.isFinite(parsedTemp)
    ? Math.min(2, Math.max(0, parsedTemp))
    : 0.92;

  const libraryContext = await loadAntiRepeatLibraryContext(
    normalized.language,
    opts?.userId ?? null
  );

  let attempt = 0;
  let lastError: unknown = null;
  while (attempt <= retries) {
    try {
      const prompt = buildStoryGenerationPrompt(
        normalized,
        randomBytes(8).toString("hex"),
        libraryContext,
        character
      );
      const raw = opts?.complete
        ? await opts.complete(prompt)
        : await (async () => {
            if (!client) throw new Error("Story model is not configured");
            for (const model of models) {
              const response = await client.responses.create({
                model,
                input: prompt,
                max_output_tokens: outputTokenHint(normalized.length),
                temperature,
              });
              if (response.output_text?.trim()) return response.output_text;
            }
            return "";
          })();
      const generated = withDerivedBrief(raw, normalized, character);
      if (generated.text) return generated;
      throw new Error("Model returned empty story output");
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > retries || !worthRetrying(error)) break;
    }
  }

  if (posterProviderTransportFailureMessage(getErrorMessage(lastError, ""))) {
    throw createError("The story service could not be reached. Nothing was saved. Please try again in a moment.", 503);
  }
  throw lastError ?? new Error("Story generation failed");
}
