import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import type { TextToSpeechRequest } from "@elevenlabs/elevenlabs-js/api/resources/textToSpeech/client/requests/TextToSpeechRequest";
import { resolveVoiceById } from "@/lib/voices";
import { createError } from "@/lib/errors";
import { captureMessage } from "@/lib/monitoring";

export type ElevenTtsInput = {
  text: string;
  speed?: number;
  emotion?: number;
  voiceId?: string;
  language?: string;
};

export function prepareElevenText(text: string, language: string) {
  const isZh = String(language).toLowerCase().startsWith("zh");
  let cleaned = String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([，。！？；：、])\s*/g, "$1")
    .replace(/([,.!?;:])\s*/g, "$1 ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (isZh) {
    const zhFixMap: Array<[RegExp, string]> = [];
    for (const [re, rep] of zhFixMap) cleaned = cleaned.replace(re, rep);
  }

  return cleaned;
}

export function buildElevenTtsRequest(
  text: string,
  speed: number,
  emotion: number,
  language: string,
  modelId: string
): TextToSpeechRequest {
  const isZh = String(language).toLowerCase().startsWith("zh");
  const normalizedSpeed = Math.max(0.78, Math.min(1.08, Number(speed)));
  const emotionNum = Number.isFinite(Number(emotion)) ? Number(emotion) : 40;
  const emotion01 = Math.max(0, Math.min(1, emotionNum > 1 ? emotionNum / 100 : emotionNum));

  const stability = isZh ? 0.72 - emotion01 * 0.27 : 0.65 - emotion01 * 0.45;
  const style = isZh ? 0.1 + emotion01 * 0.35 : 0.15 + emotion01 * 0.8;
  const similarityBoost = isZh ? 0.78 : 0.85;

  const base: TextToSpeechRequest = {
    text,
    modelId,
    voiceSettings: {
      stability,
      similarityBoost,
      style,
      useSpeakerBoost: true,
      speed: normalizedSpeed,
    },
  };

  // eleven_v3 does not accept previousText / next_text (API returns unsupported_model).
  const isElevenV3 = modelId === "eleven_v3";
  if (!isElevenV3) {
    base.previousText = text.slice(0, 120);
    base.nextText = text.slice(-120);
    base.seed = 42;
  }

  return base;
}

async function readableStreamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.byteLength) chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function speakWithEleven(input: ElevenTtsInput) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const fallbackVoiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey) {
    throw createError("Missing ELEVENLABS_API_KEY", 500);
  }

  const language = String(input.language ?? "zh-Hant");
  const text = String(input.text ?? "").trim();
  if (!text) {
    throw createError("Missing text", 400);
  }

  const resolved = resolveVoiceById(input.voiceId, language);
  const resolvedElevenVoiceId = resolved?.elevenId ?? fallbackVoiceId;
  if (!resolvedElevenVoiceId) {
    throw createError("Missing ELEVENLABS_VOICE_ID", 500);
  }

  const modelId =
    String(process.env.ELEVENLABS_TTS_MODEL ?? "").trim() || "eleven_v3";

  const cleanedText = prepareElevenText(text, language);
  const ttsRequest: TextToSpeechRequest = {
    ...buildElevenTtsRequest(
      cleanedText,
      Number(input.speed ?? 0.95),
      Number(input.emotion ?? 40),
      language,
      modelId
    ),
    outputFormat: "mp3_44100_128",
  };

  const client = new ElevenLabsClient({ apiKey });

  try {
    const { data: stream, rawResponse } = await client.textToSpeech
      .convert(resolvedElevenVoiceId, ttsRequest)
      .withRawResponse();

    if (process.env.NODE_ENV === "development") {
      const charCount = rawResponse.headers?.get?.("x-character-count");
      const requestId = rawResponse.headers?.get?.("request-id");
      if (charCount != null || requestId != null) {
        captureMessage("ElevenLabs TTS generation", {
          characterCount: charCount,
          requestId,
        });
      }
    }

    return readableStreamToBuffer(stream);
  } catch (err) {
    if (err instanceof ElevenLabsError) {
      const body =
        typeof err.body === "string"
          ? err.body
          : err.body != null
            ? JSON.stringify(err.body)
            : "";
      throw createError(body || err.message || "ElevenLabs request failed", err.statusCode ?? 502);
    }
    throw err;
  }
}
