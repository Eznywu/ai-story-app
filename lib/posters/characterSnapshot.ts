import { createHash } from "node:crypto";

export type CharacterAppearance = {
  colours: string;
  proportions: string;
  clothing: string;
  accessories: string;
};

/**
 * Frozen picture of the selected character at the moment a story is saved.
 * Later edits to the profile must not change artwork for this story.
 * `characterAge` is the protagonist's age and may differ from the listener's age.
 */
export type CharacterSnapshot = {
  id: string | null;
  version: string | null;
  name: string;
  /** Species or role, such as "human child", "rabbit", or "dragon". */
  type: string;
  characterAge: string | null;
  appearance: CharacterAppearance;
  referenceImageUrl: string | null;
};

const DEFAULT_APPEARANCE: CharacterAppearance = {
  colours: "warm natural colours",
  proportions: "gentle storybook proportions",
  clothing: "simple comfortable clothes",
  accessories: "none",
};

function clean(value: string | null | undefined, fallback: string): string {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  return trimmed || fallback;
}

function parseAppearanceNotes(notes: string | null | undefined): Partial<CharacterAppearance> {
  const text = (notes ?? "").replace(/\s+/g, " ").trim();
  if (!text) return {};
  const pick = (labels: string[]) => {
    for (const label of labels) {
      const match = text.match(new RegExp(`${label}\\s*[:：]\\s*([^.;]+)`, "i"));
      if (match?.[1]) return match[1].trim();
    }
    return "";
  };
  return {
    colours: pick(["colours", "colors", "顏色", "颜色"]) || undefined,
    proportions: pick(["proportions", "比例"]) || undefined,
    clothing: pick(["clothing", "clothes", "服裝", "服装"]) || undefined,
    accessories: pick(["accessories", "accessory", "配件"]) || undefined,
  };
}

export function appearanceVersion(snapshot: Omit<CharacterSnapshot, "version">): string {
  const payload = JSON.stringify({
    id: snapshot.id,
    name: snapshot.name,
    type: snapshot.type,
    characterAge: snapshot.characterAge,
    appearance: snapshot.appearance,
    referenceImageUrl: snapshot.referenceImageUrl,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function buildCharacterSnapshot(input: {
  id?: string | null;
  version?: string | null;
  name?: string | null;
  type?: string | null;
  characterAge?: string | null;
  appearance?: Partial<CharacterAppearance> | null;
  visualStyle?: string | null;
  referenceImageUrl?: string | null;
  childGender?: string | null;
}): CharacterSnapshot {
  const notes = parseAppearanceNotes(input.visualStyle);
  const gender = (input.childGender ?? "").toLowerCase();
  const explicitType = clean(input.type, "");
  const type =
    explicitType ||
    (gender === "girl" || gender === "boy" || gender === "nonbinary" ? "human child" : "story character");
  const appearance: CharacterAppearance = {
    colours: clean(input.appearance?.colours || notes.colours, DEFAULT_APPEARANCE.colours),
    proportions: clean(
      input.appearance?.proportions || notes.proportions,
      DEFAULT_APPEARANCE.proportions
    ),
    clothing: clean(input.appearance?.clothing || notes.clothing, DEFAULT_APPEARANCE.clothing),
    accessories: clean(
      input.appearance?.accessories || notes.accessories,
      DEFAULT_APPEARANCE.accessories
    ),
  };
  const base = {
    id: input.id?.trim() || null,
    name: clean(input.name, "the listener"),
    type,
    characterAge: input.characterAge?.trim() || null,
    appearance,
    referenceImageUrl: input.referenceImageUrl?.trim() || null,
  };
  return {
    ...base,
    version: input.version?.trim() || appearanceVersion(base),
  };
}

export function readCharacterSnapshot(value: unknown): CharacterSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const appearance = row.appearance;
  if (!appearance || typeof appearance !== "object") return null;
  const look = appearance as Record<string, unknown>;
  if (typeof row.name !== "string" || typeof row.type !== "string") return null;
  return buildCharacterSnapshot({
    id: typeof row.id === "string" ? row.id : null,
    version: typeof row.version === "string" ? row.version : null,
    name: row.name,
    type: row.type,
    characterAge: typeof row.characterAge === "string" ? row.characterAge : null,
    appearance: {
      colours: typeof look.colours === "string" ? look.colours : "",
      proportions: typeof look.proportions === "string" ? look.proportions : "",
      clothing: typeof look.clothing === "string" ? look.clothing : "",
      accessories: typeof look.accessories === "string" ? look.accessories : "",
    },
    referenceImageUrl: typeof row.referenceImageUrl === "string" ? row.referenceImageUrl : null,
  });
}
