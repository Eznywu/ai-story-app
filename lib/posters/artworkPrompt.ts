import type { AudienceAge } from "@/lib/posters/audienceAge";
import type { CharacterSnapshot } from "@/lib/posters/characterSnapshot";
import type { VisualBrief } from "@/lib/posters/visualBrief";

export const ART_STYLE_VERSION = "happy-horse-1";
export const PROMPT_VERSION = "ab21-art-1";

const AGE_PRESETS: Record<AudienceAge["band"], string> = {
  "0-2":
    "Age band 0–2 design preset: one prominent friendly character, a very simple setting, few shapes, rounder forms, and one gentle expression. Keep the scene simple. This is a picture preset, not a claim about child development.",
  "3-5":
    "Age band 3–5 design preset: one clear action or discovery, one or two characters, round but expressive forms, and recognisable surroundings. This is a picture preset, not a claim about child development.",
  "6-8":
    "Age band 6–8 design preset: a richer layered place, a specific exploration from the story, expressive faces and costume, less round and less babyish than the younger bands, still kind and calm. This is a picture preset, not a claim about child development.",
  "9+":
    "Age band 9+ design preset: more sophisticated storytelling, finer costume and scenery, a clear story beat, less babyish styling, not a toddler picture, still calm and kind. This is a picture preset, not a claim about child development.",
};

const GENRE_PALETTE: Record<string, string> = {
  Animals: "living moss, cream, and warm terracotta, with plants that have real colour",
  Adventure:
    "dusk blue, deep moss, and warm paper-lantern light — exciting and bedtime-safe, never perilous, and not a harsh gold glow",
  Fantasy: "twilight violet, cream mist, and a soft enchanted light, with no threat",
  Friendship: "warm coral, cream, and a shared action in a rich but gentle light",
  Family: "honey-brown wood, cream, and a cozy lamp",
  Magic: "deep lavender, teal shadow, and one calm sparkle",
  Nature: "sage, a clear sky, and sunlit or moonlit leaves",
  Space: "deep navy, cream stars, a pale moon, and a hint of teal, friendly and calm",
  Underwater: "teal and blue-green water with soft light rays and a visible depth",
  Holiday: "terracotta, cream, and one quiet seasonal colour",
  "Fairy Tale": "storybook dusk, woodland brown, cream, and one small jewel accent",
  Mystery:
    "moonlit blue, cream, and one warm clue light, reassuring and suitable for bedtime, never scary",
  Superhero: "clear sky blue and a kind brave colour, no violence",
  "Bedtime Classic": "moonlight silver, sleepy blue, and cream",
};

function genrePalette(genre: string): string {
  return GENRE_PALETTE[genre] ?? `a rich bedtime-safe ${genre.toLowerCase()} palette with a clear focal light`;
}

function referenceLine(url: string | null, attached: boolean): string {
  if (attached) {
    return "An approved reference image is attached to this request. Match that character exactly: same species, colours, signature clothing, accessory, and proportions. Do not invent a new face or species.";
  }
  if (url) {
    return "A reference image is on file but was not attached. Repeat the character sheet exactly. Do not invent a new face or species.";
  }
  return "No reference image is attached. Repeat the character sheet exactly.";
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
  /** True only when reference bytes will be sent with this request. */
  referenceAttached?: boolean;
}): string {
  const genre = input.genre.trim() || input.brief.genre || "Bedtime";
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
    "Paint an expressive, polished storybook character with soft dimensional shading, tactile textures, and a distinctive friendly personality.",
    "Keep a calm bedtime mood: no neon, no horror, and no bright gold glow. Genre colour and the focal light may be rich and strong. Do not flatten the picture into one muted cream palette.",
    AGE_PRESETS[input.audience.band],
    `Audience (listener) age: ${input.audience.label}. Artwork age band: ${input.audience.band}.`,
    `Protagonist age, kept separate from the listener: ${protagonistAge}.`,
    `Protagonist identity, which must not change: ${input.character.name}, a ${input.character.type}.`,
    `Stable appearance, repeat exactly: ${look}.`,
    "Make this protagonist large, prominent, and recognisable. The same species, colours, signature clothing, accessory, and proportions must survive every story.",
    referenceLine(input.character.referenceImageUrl, input.referenceAttached === true),
    `Show this story moment as a clear action or discovery from the story, not a generic gentle moment: ${input.brief.moment}`,
    `Protagonist in the scene: ${input.brief.protagonist}`,
    `Setting: ${input.brief.setting}`,
    `Action: ${input.brief.action}`,
    `Emotion: ${input.brief.emotion}`,
    `Props: ${input.brief.props.join(", ")}`,
    `Composition: ${input.brief.composition}`,
    "Layer the scenery: a foreground, the protagonist large in the middle ground, and a deeper background.",
    `Genre “${genre}” may change only the setting, props, lighting, and mood. Palette: ${genrePalette(genre)}.`,
    "Use one strong focal light on the protagonist so the character reads first. Keep the falloff soft enough for bedtime, and do not turn it into a harsh gold glow.",
    "Do not replace the protagonist with a different species or a different person. If the protagonist is a human child, they stay a human child even when the genre is Animals.",
    "Place the face in the upper two-thirds, fully visible, with a clear expression. Keep the bottom fifth as open ground or path, with no face or hands there.",
    "Keep the full character in frame. No text, letters, watermark, logo, caption, border, or collage.",
    "Adventure and mystery stay reassuring and suitable for bedtime.",
  ].join("\n");
}
