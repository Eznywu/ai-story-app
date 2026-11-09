import type { AgeBand } from "@/lib/posters/audienceAge";
import { parseAudienceAge } from "@/lib/posters/audienceAge";
import { buildCharacterSnapshot, type CharacterSnapshot } from "@/lib/posters/characterSnapshot";

export const VISUAL_BRIEF_MARKER = "VISUAL_BRIEF_JSON:";
export const VISUAL_BRIEF_VERSION = 1;

export type VisualBrief = {
  version: typeof VISUAL_BRIEF_VERSION;
  moment: string;
  protagonist: string;
  setting: string;
  action: string;
  emotion: string;
  props: string[];
  composition: string;
  ageBand: AgeBand;
  genre: string;
};

const MAX_FIELD = 280;

function clip(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_FIELD);
}

function asBand(value: unknown, fallback: AgeBand): AgeBand {
  if (value === "0-2" || value === "3-5" || value === "6-8" || value === "9+") return value;
  return fallback;
}

/** Returns a brief only when every required field is usable. */
export function validateVisualBrief(value: unknown, fallbackBand: AgeBand = "3-5"): VisualBrief | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const moment = typeof row.moment === "string" ? clip(row.moment) : "";
  const protagonist = typeof row.protagonist === "string" ? clip(row.protagonist) : "";
  const setting = typeof row.setting === "string" ? clip(row.setting) : "";
  const action = typeof row.action === "string" ? clip(row.action) : "";
  const emotion = typeof row.emotion === "string" ? clip(row.emotion) : "";
  const composition = typeof row.composition === "string" ? clip(row.composition) : "";
  const genre = typeof row.genre === "string" ? clip(row.genre) : "";
  const props = Array.isArray(row.props)
    ? row.props
        .filter((item): item is string => typeof item === "string")
        .map((item) => clip(item))
        .filter(Boolean)
        .slice(0, 2)
    : [];
  if (!moment || !protagonist || !setting || !action || !emotion || !composition) return null;
  if (props.length < 1) return null;
  return {
    version: VISUAL_BRIEF_VERSION,
    moment,
    protagonist,
    setting,
    action,
    emotion,
    props,
    composition,
    ageBand: asBand(row.ageBand, fallbackBand),
    genre: genre || "Bedtime",
  };
}

function parseJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

/**
 * Pulls a story and an optional brief out of one model response.
 * An invalid brief leaves the story intact and returns null for the brief.
 */
export function splitStoryAndBrief(raw: string, fallbackBand: AgeBand = "3-5"): {
  story: string;
  visualBrief: VisualBrief | null;
} {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return { story: "", visualBrief: null };

  const markerAt = text.lastIndexOf(VISUAL_BRIEF_MARKER);
  if (markerAt >= 0) {
    const story = text.slice(0, markerAt).trim();
    const parsed = parseJsonObject(text.slice(markerAt + VISUAL_BRIEF_MARKER.length));
    return {
      story: story || text,
      visualBrief: validateVisualBrief(parsed, fallbackBand),
    };
  }

  const whole = parseJsonObject(text);
  if (whole && typeof whole === "object") {
    const row = whole as Record<string, unknown>;
    if (typeof row.story === "string" && row.story.trim()) {
      return {
        story: row.story.trim(),
        visualBrief: validateVisualBrief(row.visualBrief ?? row, fallbackBand),
      };
    }
  }

  return { story: text, visualBrief: null };
}

export function visualBriefInstructions(isZh: boolean): string {
  const shape =
    '{"moment":"","protagonist":"","setting":"","action":"","emotion":"","props":["",""],"composition":"","ageBand":"0-2","genre":""}';
  if (isZh) {
    return [
      `故事正文結束後，另起一行，只寫 ${VISUAL_BRIEF_MARKER}`,
      "下一行只放一個 JSON 物件，不要再寫別的文字。",
      `欄位：${shape}`,
      "moment 是一個看得懂的畫面。protagonist 必須是選定的角色，不可換成另一種生物。action 必須是這個故事裡角色正在做的一件事，不要寫成空泛的安靜片刻。0–2 歲只要一個簡單動作。6–8 和 9+ 要更豐富的情節，不要畫成幼兒圖。props 一到兩個。composition 要適合該年齡帶。",
    ].join("\n");
  }
  return [
    `After the story, on its own line, write ${VISUAL_BRIEF_MARKER}`,
    "Then one JSON object and nothing else.",
    `Fields: ${shape}`,
    "moment is one clear picture. protagonist must stay the selected character and must not change species. action is one specific thing the protagonist does in this story, not a generic gentle moment. Ages 0–2 stay one simple action. Ages 6–8 and 9+ need a richer story beat and less babyish styling. props has one or two items. composition matches the audience age band.",
  ].join("\n");
}

export function deriveVisualBrief(input: {
  title?: string | null;
  story?: string | null;
  genre?: string | null;
  age?: string | null;
  character?: CharacterSnapshot | null;
}): VisualBrief {
  const audience = parseAudienceAge(input.age);
  const character =
    input.character ??
    buildCharacterSnapshot({
      name: "the listener",
      type: "story character",
    });
  const genre = (input.genre ?? "").trim() || "Bedtime";
  const title = (input.title ?? "").trim();
  const firstSentence = (input.story ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[。！？.!?])\s/)[0]
    ?.slice(0, 180);
  const look = `${character.name}, a ${character.type}, ${character.appearance.colours}, ${character.appearance.clothing}`;
  const moment =
    firstSentence ||
    (title
      ? `${character.name} discovers something in “${title}”`
      : `${character.name} discovers something in a ${genre.toLowerCase()} scene`);
  const younger = audience.band === "0-2";
  const composition =
    audience.band === "0-2"
      ? "One friendly character, a very simple setting, a gentle expression, and lots of calm space."
      : audience.band === "3-5"
        ? "One clear action or discovery, one or two characters, a recognisable place."
        : audience.band === "6-8"
          ? "A richer layered place, a specific exploration, and an expressive interaction. Less babyish than a toddler picture."
          : "A more sophisticated story beat, finer costume and scenery, less babyish styling, still calm and kind.";
  return {
    version: VISUAL_BRIEF_VERSION,
    moment: clip(moment),
    protagonist: clip(look),
    setting: clip(
      younger
        ? `A very simple bedtime-safe ${genre.toLowerCase()} place`
        : `A layered bedtime-safe ${genre.toLowerCase()} place with a foreground and a deeper background`
    ),
    action: clip(firstSentence || `${character.name} takes one clear action in this scene`),
    emotion: younger ? "calm and safe" : "wonder, excitement, and a safe bedtime calm",
    props: younger ? ["a small comforting object"] : ["one story prop"],
    composition,
    ageBand: audience.band,
    genre,
  };
}
