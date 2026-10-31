export const posterPromptConfig = {
  basePrompt: `
Create a vertical illustrated children's story poster for "{title}" in the "{genre}" style. The poster must match the story's mood, setting, and emotional tone. Include at least 1 character and no more than 3 characters total. Make the characters the clear focal point, expressive, memorable, and appropriate for the story. Avoid crowded scenes and do not include extra background people. The environment should strongly reflect the genre atmosphere and support the narrative visually. Leave clean space for the title at the top. Use cinematic composition, rich storybook illustration, beautiful lighting, polished details, whimsical children's poster aesthetic, emotionally engaging, premium quality, no text, no watermark.
  `.trim(),

  genrePrompts: {
    Animals: `
Create a vertical illustrated children's story poster in an Animals theme for the story "{title}". The poster should capture a warm, charming, nature-filled storybook feeling. Include 1 to 3 animal characters only, with expressive faces and lovable personalities, shown in a natural or lightly magical environment that fits the story. Focus on emotional connection, adventure, and cuteness. Add soft natural lighting, lush scenery, and gentle movement. Keep the composition clean, cinematic, and suitable for a children's poster, with open space for the title at the top.
    `.trim(),

    Adventure: `
Create a vertical illustrated children's story poster in an Adventure theme for the story "{title}". The poster should feel exciting, bold, and full of discovery. Include 1 to 3 main characters in a dynamic action-forward scene, traveling, exploring, or facing a challenge. Show a dramatic environment such as mountains, jungle paths, ancient ruins, floating islands, or a mysterious map-led journey. Use cinematic composition, energetic poses, strong depth, and vivid lighting. Keep it clean and iconic, with room for the title at the top.
    `.trim(),

    Fantasy: `
Create a vertical illustrated children's story poster in a Fantasy theme for the story "{title}". The poster should feel magical, grand, and dreamlike. Include 1 to 3 characters surrounded by enchanted elements such as glowing forests, castles, dragons, floating lights, mystical creatures, or magical objects. The atmosphere should feel immersive and wondrous, with rich colors, magical glow, and cinematic fantasy storytelling. Keep the characters central and the composition elegant, with clear title space at the top.
    `.trim(),

    Friendship: `
Create a vertical illustrated children's story poster in a Friendship theme for the story "{title}". The poster should highlight emotional warmth, trust, companionship, and joyful connection. Include 2 or 3 characters whenever possible, showing meaningful interaction such as helping, playing, hugging, exploring, or sharing a special moment. The background should support a wholesome and uplifting mood. Use soft, heartwarming lighting, expressive character emotions, and a clean children's book poster layout with room for the title at the top.
    `.trim(),

    Family: `
Create a vertical illustrated children's story poster in a Family theme for the story "{title}". The poster should feel loving, comforting, and emotionally grounded. Include 1 to 3 family members or family-like characters, showing warmth, care, and closeness. The setting may be a cozy home, a family journey, a celebration, or a meaningful daily-life scene. Use warm lighting, soft storytelling details, expressive body language, and a polished storybook illustration style. Keep the composition uncluttered with title space at the top.
    `.trim(),

    Magic: `
Create a vertical illustrated children's story poster in a Magic theme for the story "{title}". The poster should feel mysterious, sparkling, and full of wonder. Include 1 to 3 characters interacting with magical energy, enchanted objects, spell effects, glowing symbols, or mystical transformations. Use luminous lighting, magical particles, elegant motion, and a visually captivating fantasy-like atmosphere. Keep the characters as the focal point and preserve clean space for the title at the top.
    `.trim(),

    Nature: `
Create a vertical illustrated children's story poster in a Nature theme for the story "{title}". The poster should celebrate the beauty of the natural world with a peaceful, fresh, and immersive atmosphere. Include 1 to 3 characters exploring or connecting with forests, flowers, rivers, mountains, seasons, or wildlife. Use rich environmental storytelling, soft sunlight or golden-hour light, organic colors, and gentle wonder. Keep the composition balanced, emotional, and clean with room for the title at the top.
    `.trim(),

    Space: `
Create a vertical illustrated children's story poster in a Space theme for the story "{title}". The poster should feel imaginative, adventurous, and cosmic. Include 1 to 3 characters in a visually exciting space environment such as stars, planets, nebulae, moons, spacecraft, or alien worlds. The mood can be curious, magical, or heroic, but should remain child-friendly and visually enchanting. Use glowing celestial colors, cinematic scale, and strong focal composition, with clear title space at the top.
    `.trim(),

    Underwater: `
Create a vertical illustrated children's story poster in an Underwater theme for the story "{title}". The poster should feel immersive, magical, and fluid. Include 1 to 3 characters swimming, exploring, or interacting in an underwater world filled with coral reefs, sea creatures, light rays, bubbles, ruins, or treasure. Use dreamy aquatic lighting, blue-green color harmony, graceful movement, and a whimsical storybook look. Keep the composition clean and poster-friendly with room for the title at the top.
    `.trim(),

    Holiday: `
Create a vertical illustrated children's story poster in a Holiday theme for the story "{title}". The poster should feel festive, joyful, and full of seasonal charm. Include 1 to 3 characters celebrating or experiencing a special holiday moment. Reflect the holiday atmosphere through decorations, seasonal colors, lights, weather, gifts, traditions, or cozy celebration details. Keep the mood warm and magical, with a polished family-friendly poster composition and title space at the top.
    `.trim(),

    "Fairy Tale": `
Create a vertical illustrated children's story poster in a Fairy Tale theme for the story "{title}". The poster should feel timeless, enchanting, and storybook-classic. Include 1 to 3 characters in a magical fairy-tale world with castles, forests, moonlight, kingdoms, folklore-inspired costumes, or mythical creatures. The mood should be elegant, whimsical, and emotionally rich, like a classic illustrated tale brought to life. Keep the composition graceful and uncluttered, with clear room for the title at the top.
    `.trim(),

    Mystery: `
Create a vertical illustrated children's story poster in a Mystery theme for the story "{title}". The poster should feel intriguing, atmospheric, and full of clues, while still child-friendly. Include 1 to 3 characters in a mysterious scene involving hidden doors, moonlit paths, old keys, libraries, shadowy silhouettes, glowing clues, or secret maps. Use dramatic lighting, curious expressions, and a sense of suspense without becoming scary. Keep the composition clean, cinematic, and suitable for a children's poster, with title space at the top.
    `.trim(),

    Superhero: `
Create a vertical illustrated children's story poster in a Superhero theme for the story "{title}". The poster should feel heroic, inspiring, bold, and energetic. Include 1 to 3 characters in strong heroic poses, showing courage, action, and a sense of purpose. Add visually exciting effects such as capes, powers, dynamic cityscapes, glowing energy, or dramatic skies, while keeping the tone child-friendly and imaginative. Use cinematic perspective, strong focal contrast, and open title space at the top.
    `.trim(),

    "Bedtime Classic": `
Create a vertical illustrated children's story poster in a Bedtime Classic theme for the story "{title}". The poster should feel calm, cozy, dreamy, and soothing. Include 1 to 3 characters in a peaceful nighttime moment, such as drifting to sleep, stargazing, cuddling, reading, or entering a gentle dream world. Use moonlight, soft glows, dreamy clouds, warm blankets, stars, and comforting colors. The composition should be simple, tender, and restful, with space for the title at the top.
    `.trim(),
  },

  styleEnhancers: {
    Animals: "cute expressive animal protagonists, warm woodland charm",
    Adventure: "dynamic motion, epic journey feeling, sense of discovery",
    Fantasy: "enchanted world, magical glow, dreamlike grandeur",
    Friendship: "heartwarming interaction, emotional connection",
    Family: "comforting warmth, closeness, loving atmosphere",
    Magic: "sparkling spell effects, mystical wonder",
    Nature: "lush landscapes, peaceful organic beauty",
    Space: "cosmic wonder, planets, stars, imaginative sci-fi fantasy",
    Underwater: "glowing ocean depth, coral beauty, floating movement",
    Holiday: "festive charm, seasonal decorations, celebratory warmth",
    "Fairy Tale": "classic folklore elegance, timeless enchanted mood",
    Mystery: "curious clues, secret places, gentle suspense",
    Superhero: "heroic pose, dynamic power effects, inspiring energy",
    "Bedtime Classic": "soft moonlight, dreamy comfort, sleepy peacefulness",
  },

  consistencyAddon: `
Poster composition only, vertical format, centered focal characters, at least 1 and no more than 3 characters, no crowded background, no extra background people, no text, no watermark, no logo, no split panels, no collage, no messy composition, no horror elements, child-friendly, visually coherent, premium illustrated storybook poster quality.
  `.trim(),

  negativePrompt: `
too many characters, more than 3 characters, crowd, extra people, realistic photo, horror, scary face, grotesque, messy background, cluttered composition, text, letters, watermark, logo, low detail, blurry, distorted hands, deformed face, dark violent tone, adult theme
  `.trim(),
} as const;

export type PosterGenreKey = keyof typeof posterPromptConfig.genrePrompts;

const GENRE_KEYS = new Set<string>(Object.keys(posterPromptConfig.genrePrompts));

/** Maps UI / API genre strings to a configured prompt bucket; defaults to Bedtime Classic. */
export function resolvePosterPromptGenre(genre?: string): PosterGenreKey {
  const g = genre?.trim() ?? "";
  if (g && GENRE_KEYS.has(g)) return g as PosterGenreKey;
  return "Bedtime Classic";
}

/** Keeps full image prompt within ~4k limits (e.g. DALL·E 3) alongside base + genre blocks. */
const STORY_SUMMARY_MAX_CHARS = 1200;

export function buildPosterPrompt(params: { title: string; genre?: string; story?: string }) {
  const title = params.title?.trim() || "Bedtime Story";
  const genre = resolvePosterPromptGenre(params.genre);

  const base = posterPromptConfig.basePrompt.replaceAll("{title}", title).replaceAll("{genre}", genre);

  const genrePrompt = posterPromptConfig.genrePrompts[genre].replaceAll("{title}", title);

  const enhancer = posterPromptConfig.styleEnhancers[genre];
  const storyNorm = params.story?.trim().replace(/\s+/g, " ");
  const storyBlock = storyNorm ? `Story summary: ${storyNorm.slice(0, STORY_SUMMARY_MAX_CHARS)}` : "";

  return [base, genrePrompt, storyBlock, `Style enhancer: ${enhancer}.`, posterPromptConfig.consistencyAddon]
    .filter(Boolean)
    .join("\n\n");
}

/** Full image-model prompt including avoid-list (DALL·E / Imagen have no separate negative field). */
export function buildPosterImagePrompt(params: { title: string; genre?: string; story?: string }): string {
  return [
    buildPosterPrompt(params),
    `Avoid or minimize: ${posterPromptConfig.negativePrompt.replace(/\s+/g, " ").trim()}`,
  ].join("\n\n");
}
