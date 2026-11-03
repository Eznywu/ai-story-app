import { parseAudienceAge } from "@/lib/posters/audienceAge";
import { buildArtworkPrompt } from "@/lib/posters/artworkPrompt";
import { buildCharacterSnapshot } from "@/lib/posters/characterSnapshot";
import type { VisualBrief } from "@/lib/posters/visualBrief";

/** The one authorised reference scene. Do not vary this when comparing qualities. */
export const LULU_REFERENCE = {
  title: "Lulu and the Lantern Path",
  childName: "Lulu",
  listenerAge: "4 years",
  genre: "Adventure",
  language: "en",
} as const;

export const luluReferenceCharacter = buildCharacterSnapshot({
  id: "char_lulu",
  version: "lulu-scarf-1",
  name: "Lulu",
  type: "rabbit",
  characterAge: "3 years",
  appearance: {
    colours: "soft grey fur with a white chest",
    proportions: "round storybook rabbit",
    clothing: "a blue knitted scarf",
    accessories: "one small brass bell",
  },
});

export const luluReferenceBrief: VisualBrief = {
  version: 1,
  moment: "Lulu discovers a lantern path and hops toward the first glowing lantern.",
  protagonist: "Lulu, a grey rabbit wearing her blue knitted scarf, curious and delighted",
  setting: "a gentle woodland path with paper lanterns in the trees and open ground in front",
  action: "Lulu finds the path and leans forward to look at the nearest lantern",
  emotion: "wonder, excitement, and a safe bedtime calm",
  props: ["blue knitted scarf", "paper lantern"],
  composition: "Lulu large in the middle, lanterns receding down the path, face in the upper two-thirds",
  ageBand: "3-5",
  genre: "Adventure",
};

export function luluReferencePrompt(): string {
  return buildArtworkPrompt({
    audience: parseAudienceAge(LULU_REFERENCE.listenerAge),
    character: luluReferenceCharacter,
    brief: luluReferenceBrief,
    genre: LULU_REFERENCE.genre,
  });
}
