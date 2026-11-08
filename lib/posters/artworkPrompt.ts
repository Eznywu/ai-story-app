import type { AudienceAge } from "@/lib/posters/audienceAge";
import type { CharacterSnapshot } from "@/lib/posters/characterSnapshot";
import type { VisualBrief } from "@/lib/posters/visualBrief";

export const ART_STYLE_VERSION = "happy-horse-1";
export const PROMPT_VERSION = "ab13-art-2";

const AGE_PRESETS: Record<AudienceAge["band"], string> = {
  "0-2":
    "Age band 0–2 design preset: one prominent friendly character, a very simple setting, few elements, rounder shapes, and a gentle expression. This is a picture preset, not a claim about child development.",
  "3-5":
    "Age band 3–5 design preset: one clear action or discovery, one or two characters, round but expressive forms, and recognisable surroundings. This is a picture preset, not a claim about child development.",
  "6-8":
    "Age band 6–8 design preset: a richer layered place, a small exploration, and an expressive interaction. Less babyish than the younger bands, still soft. This is a picture preset, not a claim about child development.",
  "9+":
    "Age band 9+ design preset: more sophisticated storytelling, finer costume and scenery, less babyish styling, still calm and kind. This is a picture preset, not a claim about child development.",
};

const GENRE_PALETTE: Record<string, string> = {
  Animals: "sage greens, cream, and a little terracotta, with plants in the setting only",
  Adventure: "moss green, dusk blue, and a small warm paper-lantern light — exciting, bedtime-safe, never perilous, and not a harsh gold glow",
  Fantasy: "lavender dusk, cream mist, and a gentle enchanted glow without threat",
  Friendship: "warm cream and coral, shared quiet action",
  Family: "cream, brown, and a cozy indoor or porch light",
  Magic: "soft lavender and cream, a small sparkle, calm",
  Nature: "sage, sky blue, and gentle daylight or moonlight",
  Space: "deep navy, cream stars, and a pale moon, friendly and calm",
  Underwater: "blue-green water and soft light rays",
  Holiday: "cream, terracotta, and a quiet seasonal detail",
  "Fairy Tale": "cream, brown, and a classic storybook dusk",
  Mystery: "moonlit blue and cream, one curious clue, reassuring and suitable for bedtime, never scary",
  Superhero: "clear sky and a kind brave pose, no violence",
  "Bedtime Classic": "moonlight, cream, and a sleepy calm",
};

function genrePalette(genre: string): string {
  return GENRE_PALETTE[genre] ?? `a calm bedtime-safe ${genre.toLowerCase()} palette`;
}

/**
 * One shared Happy Horse illustration prompt.
 * Genre changes place, light, and props. It must not replace the protagonist.
 * The picture itself contains no words; name and title are composed later.
 */
export function buildArtworkPrompt(input: {
  audience: AudienceAge;
  character: CharacterSnapshot;
  brief: VisualBrief;
  genre: string;
}): string {
  const genre = input.genre.trim() || input.brief.genre || "Bedtime";
  const reference = input.character.referenceImageUrl
    ? "An approved reference image is on file. Match that character's stable appearance. Do not invent a new face or species."
    : "No reference photo is required.";
  const protagonistAge = input.character.characterAge?.trim() || "unspecified";
  const look = [
    input.character.type,
    input.character.appearance.colours,
    input.character.appearance.proportions,
    input.character.appearance.clothing,
    input.character.appearance.accessories,
  ]
    .filter(Boolean)
    .join("; ");

  return [
    "Square children's storybook illustration, 1024 by 1024, one complete scene.",
    "Paint an expressive, polished storybook character with soft dimensional shading and tactile textures, and a distinctive friendly personality.",
    "Happy Horse palette: cream, brown, terracotta, and sage. Calm bedtime feel. No neon, no harsh contrast, no bright gold glow.",
    AGE_PRESETS[input.audience.band],
    `Audience (listener) age: ${input.audience.label}. Artwork age band: ${input.audience.band}.`,
    `Protagonist age, kept separate from the listener: ${protagonistAge}.`,
    `Protagonist identity, which must not change: ${input.character.name}, a ${input.character.type}.`,
    `Stable appearance, repeat exactly: ${look}.`,
    "Make this protagonist large, prominent, and recognisable. The same species, colours, signature clothing, accessory, and proportions must survive every story.",
    reference,
    `Show this story moment as a clear action or discovery: ${input.brief.moment}`,
    `Protagonist in the scene: ${input.brief.protagonist}`,
    `Setting: ${input.brief.setting}`,
    `Action: ${input.brief.action}`,
    `Emotion: ${input.brief.emotion}`,
    `Props: ${input.brief.props.join(", ")}`,
    `Composition: ${input.brief.composition}`,
    "Layer the scenery: a simple foreground, the protagonist in the middle ground, and a softer background.",
    `Genre “${genre}” may change only the setting, props, lighting, and mood. Palette: ${genrePalette(genre)}.`,
    "Use one warm focal light on the protagonist. Keep the light soft.",
    "Do not replace the protagonist with a different species or a different person. If the protagonist is a human child, they stay a human child even when the genre is Animals.",
    "Place the face in the upper two-thirds, fully visible, with a clear expression. Keep the bottom fifth as open ground or path, with no face or hands there.",
    "Keep the full character in frame. No text, letters, watermark, logo, caption, border, or collage.",
    "Adventure and mystery stay reassuring and suitable for bedtime.",
  ].join("\n");
}
