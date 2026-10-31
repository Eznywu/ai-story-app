import OpenAI from "openai";
import {
  openaiPosterModel,
  openaiPosterQuality,
  openaiPosterSize,
} from "./config.js";

export async function generateOpenAiPosterPng(
  client: OpenAI,
  prompt: string
): Promise<{ png: Buffer; revisedNote?: string }> {
  const img = await client.images.generate({
    model: openaiPosterModel,
    prompt,
    size: openaiPosterSize,
    quality: openaiPosterQuality,
    output_format: "png",
    moderation: "auto",
    n: 1,
  });

  const b64 = img.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image generation returned no b64_json.");
  }

  return {
    png: Buffer.from(b64, "base64"),
    revisedNote: img.data?.[0]?.revised_prompt,
  };
}
