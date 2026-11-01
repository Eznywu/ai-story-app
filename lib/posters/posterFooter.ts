import type { AgeBand } from "@/lib/posters/audienceAge";

/** Used when a reference render has no listener stored on the story. */
export const FIXTURE_CHILD_NAME = "Mia";

export function savePosterLabel(language: string | null | undefined): string {
  return (language ?? "").toLowerCase().includes("zh") ? "儲存我的海報" : "Save my poster";
}

export function isZhLanguage(language: string | null | undefined): boolean {
  return (language ?? "").toLowerCase().includes("zh");
}

/** The listener's name, not the character. */
export function childStoryLine(language: string | null | undefined, childName: string): string {
  const name = childName.trim();
  if (!name) return "";
  return isZhLanguage(language) ? `給 ${name} 的故事` : `A story for ${name}`;
}

export function titleIncludesName(title: string, name: string): boolean {
  const who = name.trim();
  if (!who) return false;
  return title.toLowerCase().includes(who.toLowerCase());
}

export type PosterFooter = {
  title: string;
  /** "A story for Mia" / "給 Mia 的故事". Empty when no listener name is known. */
  childLine: string;
  /** Short caption, or a parent-facing line for ages 0–2. */
  note: string;
  parentFacing: boolean;
};

function shortMoment(moment: string): string {
  const clean = moment.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const cut = clean.split(/[。！？.!?]/)[0]?.trim() || clean;
  if (cut.length <= 42) return cut;
  return `${cut.slice(0, 41).trimEnd()}…`;
}

/**
 * The child's name is separate from the character. If the title already names
 * the character, that name is not repeated as its own line.
 */
export function posterFooter(input: {
  audienceBand: AgeBand;
  language?: string | null;
  listenerName?: string | null;
  characterName?: string | null;
  title: string;
  moment?: string | null;
}): PosterFooter {
  const zh = isZhLanguage(input.language);
  const title = input.title.trim() || "Happy Horse";
  const listener = (input.listenerName ?? "").trim();
  const character = (input.characterName ?? "").trim();
  const childLine = listener ? childStoryLine(input.language, listener) : "";
  const characterLine =
    !childLine && character && !titleIncludesName(title, character)
      ? isZhLanguage(input.language)
        ? character
        : character
      : "";
  if (input.audienceBand === "0-2") {
    return {
      title,
      childLine: childLine || characterLine,
      note: zh ? "給你留著" : "For you to keep",
      parentFacing: true,
    };
  }
  return {
    title,
    childLine: childLine || characterLine,
    note: shortMoment(input.moment ?? ""),
    parentFacing: false,
  };
}

export function listenerNameFromSnapshot(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const name = (value as { listenerName?: unknown }).listenerName;
  return typeof name === "string" ? name.trim() : "";
}
