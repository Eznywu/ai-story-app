import { randomBytes } from "node:crypto";
import OpenAI from "openai";
import type { StoryGenerationInput } from "@/lib/types";
import { STORY_INPUT_MAX_CHARS } from "@/lib/types";
import { createError } from "@/lib/errors";
import { loadAntiRepeatLibraryContext } from "@/lib/storyLibraryContext";

export function lengthHint(length: string) {
  if (length === "short") return "about 250-400 words";
  if (length === "medium") return "about 700-900 words";
  return "about 1200-1600 words";
}

const CHILD_GENDER_VALUES = new Set(["girl", "boy", "any", "nonbinary"]);

export function normalizeStoryInput(body: StoryGenerationInput) {
  const rawGender = String(body.childGender ?? "any").toLowerCase();
  const childGender = CHILD_GENDER_VALUES.has(rawGender) ? rawGender : "any";
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

function buildPrompt(
  input: ReturnType<typeof normalizeStoryInput>,
  freshnessSeed: string,
  libraryContext: string
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
    libraryBlock,
    freshness,
  ]
    .filter(Boolean)
    .join("\n");
}

function outputTokenHint(length: string) {
  if (length === "short") return 700;
  if (length === "medium") return 1400;
  return 2200;
}

function fallbackStory(input: ReturnType<typeof normalizeStoryInput>) {
  const isZh = input.language.toLowerCase().includes("zh");
  const name = input.mainCharacterName;
  const genre = input.genre;

  if (isZh) {
    const openers = [
      `夜晚窸窣著合上书頁聲，${name} 把小被角拉好，想聽一個關於 ${genre} 的輕柔故事。`,
      `房間裡剩下一盞暖暖的光，${name} 閉上眼睛，心裡裝著一片 ${genre} 的小天地。`,
      `屋子外面安靜下來，${name} 抱著喜歡的小枕，等一個慢慢說的 ${genre} 故事。`,
    ];
    const middles = [
      `風在窗邊寫小小的曲子，${name} 跟著節拍慢慢呼吸，一步、兩步，心像小船轻轻搖。`,
      `遠方有一聲很輕很輕的火車聲，${name} 想像它載著晚安，一步一步開向夢的月臺。`,
      `一隻不吵的貓在走廊打盹，${name} 聽著那均勻的呼吸，覺得世界變得好小、好安全。`,
    ];
    const bridges = [
      `故事裡，${name} 拾起一顆「沒關係」放在胸口，小小的，卻剛好讓肩膀鬆下來。`,
      `${name} 把今天最亮的一小件事摺好，像摺紙船，輕輕放在睡眠的河上漂走。`,
      `有人小聲說：「我們明天再玩。」${name} 在心底複說一遍，眼皮跟著變重。`,
    ];
    const closers = [
      `最後一句落在枕邊：晚安，${name}。星光替你關燈，夢替你保管悄悄話。`,
      `${name} 嘴角還留著一丁點微笑，像藏進被窩的小星星，慢慢睡著了。`,
      `晚安，${name}，願你在 ${genre} 的夢裡也被溫柔抱著。`,
    ];
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    return [pick(openers), pick(middles), pick(bridges), pick(closers)].join("\n");
  }

  const openers = [
    `${name} tugs the quilt square and asks for a ${genre.toLowerCase()} story low and slow, like a lullaby with words.`,
    `The house exhales into quiet, and ${name} waits on the pillow's edge for a gentle ${genre.toLowerCase()} tale.`,
    `A nightlight paints a small gold pool; ${name} nestles there, ready for a sleepy ${genre.toLowerCase()} adventure.`,
  ];
  const middles = [
    `Somewhere far off, a train sighs once. ${name} names the sound "goodbye, busy day" and lets it roll away.`,
    `Rain writes thin lines on the glass; ${name} counts them softly—one kindness, one breath, one rest.`,
    `A clock ticks kindly, not rushing. ${name} matches footsteps to it until shoulders melt into the mattress.`,
  ];
  const bridges = [
    `In the story's middle, ${name} pockets one brave pebble—not heavy, just enough to remember: I tried, I am safe.`,
    `A stuffed friend leans closer; ${name} shares the blanket and whispers, "We can land together."`,
    `${name} picks three slow breaths like three fireflies and releases them toward the ceiling.`,
  ];
  const closers = [
    `The last line tucks itself under ${name}'s chin: goodnight, little listener; let the ${genre.toLowerCase()} dreams stay soft.`,
    `${name} leaves a tiny grin on the pillow—a secret postcard to morning—and slips under sleep's door.`,
    `Goodnight, ${name}. The room holds still; your heart may wander, but it always has a way home.`,
  ];
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  return [pick(openers), pick(middles), pick(bridges), pick(closers)].join("\n");
}

export async function generateStoryWithRetry(
  body: StoryGenerationInput,
  opts?: { retries?: number }
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const normalized = normalizeStoryInput(body);
  const validationError = validateStoryInput(normalized);
  if (validationError) {
    throw createError(validationError, 400);
  }

  const client = new OpenAI({ apiKey, timeout: 5000, maxRetries: 0 });
  const retries = Math.max(0, opts?.retries ?? 1);
  const models = (process.env.OPENAI_STORY_MODELS ?? "gpt-4o-mini")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const parsedTemp = Number(process.env.OPENAI_STORY_TEMPERATURE);
  const temperature = Number.isFinite(parsedTemp)
    ? Math.min(2, Math.max(0, parsedTemp))
    : 0.92;

  const libraryContext = await loadAntiRepeatLibraryContext(normalized.language);

  let attempt = 0;
  let lastError: unknown = null;
  while (attempt <= retries) {
    try {
      const prompt = buildPrompt(
        normalized,
        randomBytes(8).toString("hex"),
        libraryContext
      );
      for (const model of models) {
        const response = await client.responses.create({
          model,
          input: prompt,
          max_output_tokens: outputTokenHint(normalized.length),
          temperature,
        });
        if (response.output_text?.trim()) {
          return response.output_text;
        }
      }
      throw new Error("Model returned empty story output");
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > retries) break;
    }
  }

  const message = String(
    (lastError as { message?: string } | null)?.message ?? ""
  ).toLowerCase();
  if (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("network")
  ) {
    return fallbackStory(normalized);
  }

  throw lastError ?? new Error("Story generation failed");
}
