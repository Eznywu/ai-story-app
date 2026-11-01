import type { AgeBand } from "@/lib/posters/audienceAge";

export function savePosterLabel(language: string | null | undefined): string {
  return (language ?? "").toLowerCase().includes("zh") ? "儲存我的海報" : "Save my poster";
}

export type PosterFooter = {
  /** Shown as its own line so the child is recognisable. */
  childName: string;
  title: string;
  /** Story moment, or a note addressed to the parent for ages 0–2. */
  note: string;
  parentFacing: boolean;
};

/**
 * Ages 0–2 are a parent-facing keepsake: the note speaks to the grown-up.
 * Older bands keep the child's name and a short story line.
 */
export function posterFooter(input: {
  audienceBand: AgeBand;
  language?: string | null;
  childName?: string | null;
  title: string;
  moment?: string | null;
}): PosterFooter {
  const zh = (input.language ?? "").toLowerCase().includes("zh");
  const name = (input.childName ?? "").trim();
  const title = input.title.trim() || "Happy Horse";
  if (input.audienceBand === "0-2") {
    const who = name || (zh ? "孩子" : "your child");
    return {
      childName: name,
      title,
      note: zh ? `給你留的紀念，來自和${who}的睡前。` : `A keepsake for you, from a bedtime with ${who}.`,
      parentFacing: true,
    };
  }
  return {
    childName: name,
    title,
    note: (input.moment ?? "").trim(),
    parentFacing: false,
  };
}
