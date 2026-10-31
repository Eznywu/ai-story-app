import type { AudienceAge } from "@/lib/posters/audienceAge";
import type { CharacterSnapshot } from "@/lib/posters/characterSnapshot";
import type { VisualBrief } from "@/lib/posters/visualBrief";

export const ART_STYLE_VERSION = "happy-horse-1";
export const PROMPT_VERSION = "ab13-1";

const AGE_PRESETS: Record<AudienceAge["band"], string> = {
  "0-2":
    "Age band 0–2 design preset: one prominent friendly character, a simple setting, and a gentle expression. This is a picture preset, not a claim about child development.",
  "3-5":
    "Age band 3–5 design preset: a clear action, one or two characters, and recognisable surroundings. This is a picture preset, not a claim about child development.",
  "6-8":
    "Age band 6–8 design preset: a richer environment, a sense of exploration, and expressive interaction. This is a picture preset, not a claim about child development.",
  "9+":
    "Age band 9+ design preset: a more sophisticated composition and less babyish styling, still gentle. This is a picture preset, not a claim about child development.",
};

const GENRE_MOOD: Record<string, string> = {
  Animals: "soft natural surroundings, plants or distant wildlife as setting only",
  Adventure: "a reassuring journey, discovery, and warm light — exciting but bedtime-safe, never perilous",
  Fantasy: "a gentle enchanted place, soft glow, wonder without threat",
  Friendship: "warm companionship and a shared quiet action",
  Family: "a cozy, caring place",
  Magic: "a small sparkling wonder, calm and friendly",
  Nature: "daylight or moonlight in a peaceful landscape",
  Space: "a friendly starry sky, soft colours, no danger",
  Underwater: "clear blue-green water, gentle light, friendly sea plants",
  Holiday: "a warm seasonal celebration",
  "Fairy Tale": "a classic storybook place, elegant and kind",
  Mystery: "a curious clue and soft moonlight — intriguing, reassuring, and suitable for bedtime, never scary",
  Superhero: "a kind brave pose and a bright sky, no violence",
  "Bedtime Classic": "moonlight, a blanket, and a sleepy calm",
};

function genreMood(genre: string): string {
  return GENRE_MOOD[genre] ?? `a bedtime-safe ${genre.toLowerCase()} mood`;
}

/**
 * One shared Happy Horse illustration prompt.
 * Genre changes place, props, light, and mood. It must not replace the protagonist.
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

  return [
    "Square children's storybook illustration, about 1024 by 1024, one complete scene.",
    "Happy Horse style: warm gouache storybook, cream, brown, and terracotta, soft light, kind faces, polished and calm.",
    AGE_PRESETS[input.audience.band],
    `Audience (listener) age: ${input.audience.label}. Artwork age band: ${input.audience.band}.`,
    `Protagonist age, kept separate from the listener: ${protagonistAge}.`,
    `Protagonist identity, which must not change: ${input.character.name}, a ${input.character.type}.`,
    `Stable appearance: colours ${input.character.appearance.colours}; proportions ${input.character.appearance.proportions}; clothing ${input.character.appearance.clothing}; accessories ${input.character.appearance.accessories}.`,
    reference,
    `Genre “${genre}” may change only the setting, props, lighting, and mood: ${genreMood(genre)}.`,
    "Do not replace the protagonist with a different species or a different person. If the protagonist is a human child, they stay a human child even when the genre is Animals.",
    `Scene moment: ${input.brief.moment}`,
    `Protagonist in the scene: ${input.brief.protagonist}`,
    `Setting: ${input.brief.setting}`,
    `Action: ${input.brief.action}`,
    `Emotion: ${input.brief.emotion}`,
    `Props: ${input.brief.props.join(", ")}`,
    `Composition: ${input.brief.composition}`,
    "Keep the full characters in frame, including their faces. No text, letters, watermark, logo, caption, border, or collage.",
    "Adventure and mystery stay reassuring and suitable for bedtime.",
  ].join("\n");
}
