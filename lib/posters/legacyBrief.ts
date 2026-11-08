import OpenAI from "openai";
import { getOpenAiBaseUrl, getPosterHttpDispatcher } from "@/lib/providerHttp";
import { providerTimeoutMs } from "@/lib/vercelDuration";
import type { ArtworkStoryRow } from "@/lib/posters/artworkService";
import { deriveVisualBrief } from "@/lib/posters/visualBrief";
import { buildCharacterSnapshot, readCharacterSnapshot } from "@/lib/posters/characterSnapshot";

/**
 * One cheap text request for a story that has no saved brief.
 * Used only when ARTWORK_LEGACY_BRIEF=1. Invalid output is discarded by the caller.
 */
export async function requestLegacyVisualBrief(story: ArtworkStoryRow): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const character =
    readCharacterSnapshot(story.characterSnapshot) ??
    buildCharacterSnapshot({ name: story.mainCharacterName, childGender: story.childGender });
  const timeoutMs = providerTimeoutMs(Number(process.env.OPENAI_STORY_TIMEOUT_MS), 60_000);
  const client = new OpenAI({
    apiKey,
    baseURL: getOpenAiBaseUrl(),
    timeout: timeoutMs,
    maxRetries: 0,
    fetchOptions: { dispatcher: getPosterHttpDispatcher(timeoutMs) },
  });
  const model = (process.env.OPENAI_STORY_MODELS ?? "gpt-4o-mini").split(",")[0]?.trim() || "gpt-4o-mini";
  const response = await client.responses.create({
    model,
    input: [
      "Return one JSON object only, with keys moment, protagonist, setting, action, emotion, props, composition, ageBand, genre.",
      "props is an array of one or two short strings.",
      `The protagonist stays ${character.name}, a ${character.type}. Do not change their species.`,
      `Genre: ${story.genre}. Audience age: ${story.age ?? "unspecified"}.`,
      `Story: ${story.text.slice(0, 1500)}`,
    ].join("\n"),
    max_output_tokens: 400,
    temperature: 0.2,
  });
  const text = response.output_text?.trim();
  if (!text) return deriveVisualBrief({ title: story.title, story: story.text, genre: story.genre, age: story.age, character });
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
