import { GoogleGenAI, Modality, PersonGeneration } from "@google/genai";
import {
  geminiImagenImageSize,
  geminiImagenModel,
  geminiNativeAspectRatio,
  geminiNativeImageSize,
  geminiNativeModel,
  geminiPosterBackend,
} from "./config.js";

function extractNativeImageBytes(response: unknown): Buffer | null {
  const r = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string } }> };
    }>;
  };
  const parts = r.candidates?.[0]?.content?.parts;
  if (!parts) return null;
  for (const part of parts) {
    const d = part.inlineData?.data;
    if (typeof d === "string" && d.length > 100) {
      return Buffer.from(d, "base64");
    }
  }
  return null;
}

export async function generateGeminiPosterPng(
  client: GoogleGenAI,
  prompt: string
): Promise<{ png: Buffer; backend: "native" | "imagen"; detail?: string }> {
  const backend = geminiPosterBackend === "imagen" ? "imagen" : "native";

  if (backend === "imagen") {
    const res = await client.models.generateImages({
      model: geminiImagenModel,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: geminiNativeAspectRatio,
        ...(geminiImagenImageSize ? { imageSize: geminiImagenImageSize } : {}),
        personGeneration: PersonGeneration.ALLOW_ALL,
        includeRaiReason: true,
        outputMimeType: "image/png",
      },
    });

    const gi = res.generatedImages?.[0];
    if (gi?.raiFilteredReason) {
      throw new Error(`Gemini Imagen RAI filter: ${gi.raiFilteredReason}`);
    }
    const bytes = gi?.image?.imageBytes;
    if (!bytes) {
      throw new Error("Gemini Imagen returned no imageBytes.");
    }
    return { png: Buffer.from(bytes, "base64"), backend, detail: geminiImagenModel };
  }

  const res = await client.models.generateContent({
    model: geminiNativeModel,
    contents: prompt,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      imageConfig: {
        aspectRatio: geminiNativeAspectRatio,
        imageSize: geminiNativeImageSize,
      },
    },
  });

  const buf = extractNativeImageBytes(res);
  if (buf) {
    return { png: buf, backend: "native", detail: geminiNativeModel };
  }

  const fromGetter = (res as { data?: string }).data;
  if (typeof fromGetter === "string" && fromGetter.length > 100) {
    try {
      return { png: Buffer.from(fromGetter, "base64"), backend: "native", detail: geminiNativeModel };
    } catch {
      /* fall through */
    }
  }

  throw new Error(
    `Gemini native image model returned no image (model=${geminiNativeModel}). Try GEMINI_POSTER_BACKEND=imagen or another GEMINI_NATIVE_IMAGE_MODEL.`
  );
}
