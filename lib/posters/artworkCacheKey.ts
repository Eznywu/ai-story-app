import { createHash } from "node:crypto";
import type { AudienceAge } from "@/lib/posters/audienceAge";
import { ART_STYLE_VERSION, PROMPT_VERSION } from "@/lib/posters/artworkPrompt";
import type { CharacterSnapshot } from "@/lib/posters/characterSnapshot";
import type { VisualBrief } from "@/lib/posters/visualBrief";

export type ArtworkCacheInput = {
  userId: string;
  storyId: string;
  brief: VisualBrief;
  character: CharacterSnapshot;
  audience: AudienceAge;
  genre: string;
  provider: string;
  model: string;
  quality: string;
  size: string;
  /** True when reference bytes are sent with this illustration. The URL already lives on the character. */
  referenceAttached?: boolean;
};

/**
 * Identity of the illustration. Title, caption, dedication, and layout are overlay
 * and must not be part of this key.
 */
export function artworkCacheKey(input: ArtworkCacheInput): string {
  const payload = JSON.stringify({
    userId: input.userId,
    storyId: input.storyId,
    brief: input.brief,
    character: input.character,
    ageBand: input.audience.band,
    genre: input.genre.trim(),
    artStyleVersion: ART_STYLE_VERSION,
    provider: input.provider,
    model: input.model,
    quality: input.quality,
    size: input.size,
    referenceAttached: input.referenceAttached === true,
    promptVersion: PROMPT_VERSION,
  });
  return createHash("sha256").update(payload).digest("hex");
}
