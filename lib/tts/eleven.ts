import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import type { TextToSpeechRequest } from "@elevenlabs/elevenlabs-js/api/resources/textToSpeech/client/requests/TextToSpeechRequest";
import { resolveVoiceById } from "@/lib/voices/voices";
import { createError } from "@/lib/errors";
import { captureMessage } from "@/lib/monitoring";
import { mockNarrationMp3Buffer, mockProvidersEnabled } from "@/lib/providers/mockProviders";
import { checkNarrationAudio, type AudioValidity } from "@/lib/tts/audioValidity";
import { buildElevenSpeechRequest, type ElevenSpeechRequest } from "@/lib/tts/elevenRequest";
import { getPronunciationDictionary } from "@/lib/tts/dictionaryFile";
import { planNarration, type NarrationPlan } from "@/lib/tts/planNarration";
import { renderSectionsWithRetry, retryBudgetUsd, sttBudgetUsd, usdForCharacters } from "@/lib/tts/retry";
import { createMockSpeechToText, screenTranscript, transcriptQueueDecision, type TranscriptScreen } from "@/lib/tts/stt";
import { V3_USD_PER_THOUSAND_CHARS } from "@/lib/tts/pricing";

export type ElevenTtsInput = {
  text: string;
  speed?: number;
  voiceId?: string;
  language?: string;
  /** Ignored. The warmth slider is gone. Everyday recordings use the frozen baseline until a preset is promoted. */
  emotion?: number;
};

export type NarrationSuccess = {
  ok: true;
  audio: Buffer;
  plan: NarrationPlan;
  attempts: number[];
  validity: AudioValidity;
  transcriptStatus: "mock" | "skipped_budget" | "unchecked" | "matched" | "mismatch" | "uncertain";
  transcriptNotes: string;
  screen: TranscriptScreen | null;
  retrySpentUsd: number;
  mock: boolean;
};

export type NarrationFailure = {
  ok: false;
  message: string;
  keptPrevious: boolean;
  plan: NarrationPlan;
  attempts: number[];
  retrySpentUsd: number;
  mock: boolean;
};

function friendlyElevenMessage(body: string, fallback: string) {
  const raw = body.trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { detail?: { message?: string; status?: string } | string };
    const detail = parsed.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
    if (detail && typeof detail === "object" && typeof detail.message === "string" && detail.message.trim()) {
      return detail.message.trim();
    }
  } catch {
    /* not JSON */
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
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

export function resolveNarrationVoice(voiceId: string | undefined, language: string) {
  const fallbackVoiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const resolved = resolveVoiceById(voiceId, language);
  const elevenVoiceId = resolved?.elevenId ?? fallbackVoiceId;
  if (!elevenVoiceId || !resolved) {
    throw createError("No narration voice is selected. Pick a voice, or set ELEVENLABS_VOICE_ID.", 500);
  }
  return { appVoiceId: resolved.id, elevenVoiceId };
}

export async function speakWithElevenRequest(elevenVoiceId: string, request: ElevenSpeechRequest): Promise<Buffer> {
  if (mockProvidersEnabled()) {
    console.info("[eleven-tts] mock", {
      modelId: request.modelId,
      voiceId: elevenVoiceId,
      speed: request.voiceSettings.speed,
      chars: request.text.length,
      sections: 1,
    });
    return mockNarrationMp3Buffer();
  }
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw createError("Narration needs an ElevenLabs API key. Set ELEVENLABS_API_KEY and try again.", 500);
  }
  const client = new ElevenLabsClient({ apiKey });
  const sdkRequest = {
    text: request.text,
    modelId: request.modelId,
    voiceSettings: {
      stability: request.voiceSettings.stability,
      similarityBoost: request.voiceSettings.similarityBoost,
      style: request.voiceSettings.style,
      useSpeakerBoost: request.voiceSettings.useSpeakerBoost,
      speed: request.voiceSettings.speed,
    },
    outputFormat: request.outputFormat,
    ...(request.languageCode ? { languageCode: request.languageCode } : {}),
    ...(request.previousText ? { previousText: request.previousText } : {}),
    ...(request.nextText ? { nextText: request.nextText } : {}),
  } as TextToSpeechRequest;

  try {
    const { data: stream, rawResponse } = await client.textToSpeech.convert(elevenVoiceId, sdkRequest).withRawResponse();
    if (process.env.NODE_ENV === "development") {
      const charCount = rawResponse.headers?.get?.("x-character-count");
      const requestId = rawResponse.headers?.get?.("request-id");
      if (charCount != null || requestId != null) {
        captureMessage("ElevenLabs TTS generation", { characterCount: charCount, requestId });
      }
    }
    return readableStreamToBuffer(stream);
  } catch (err) {
    if (err instanceof ElevenLabsError) {
      const body = typeof err.body === "string" ? err.body : err.body != null ? JSON.stringify(err.body) : "";
      throw createError(friendlyElevenMessage(body, err.message || "ElevenLabs request failed"), err.statusCode ?? 502);
    }
    throw err;
  }
}

export async function narrateWithEleven(input: ElevenTtsInput & { hadPreviousAudio?: boolean }): Promise<NarrationSuccess | NarrationFailure> {
  const language = String(input.language ?? "zh-Hant");
  const text = String(input.text ?? "");
  if (!text.trim()) throw createError("Add story text before making narration.", 400);

  const usingMock = mockProvidersEnabled();
  if (!process.env.ELEVENLABS_API_KEY?.trim() && !usingMock) {
    throw createError("Narration needs an ElevenLabs API key. Set ELEVENLABS_API_KEY and try again.", 500);
  }
  const voice = resolveNarrationVoice(input.voiceId, language);
  const dictionary = getPronunciationDictionary();
  const plan = planNarration({
    text,
    language,
    voiceId: voice.appVoiceId,
    dictionary,
    speed: input.speed,
  });
  const rendered = await renderSectionsWithRetry({
    sections: plan.sections.map((section) => ({ index: section.index, text: section.text })),
    hadPreviousAudio: Boolean(input.hadPreviousAudio),
    budgetUsd: retryBudgetUsd(),
    maxRegenerations: 2,
    costUsd: (sectionText) => usdForCharacters(sectionText.length, V3_USD_PER_THOUSAND_CHARS),
    synthesize: async (section) => {
      const planned = plan.sections.find((item) => item.index === section.index) ?? plan.sections[0];
      const request = buildElevenSpeechRequest({
        text: planned.text,
        modelId: plan.modelId,
        language: plan.language,
        voiceSettings: plan.voiceSettings,
        previousText: planned.previousText,
        nextText: planned.nextText,
      });
      return speakWithElevenRequest(voice.elevenVoiceId, request);
    },
    validate: (audio, sectionText) => {
      const validity = checkNarrationAudio({
        audio,
        script: sectionText,
        language: plan.language,
        speed: plan.voiceSettings.speed ?? 1,
        mock: usingMock,
      });
      return { ok: validity.ok, notes: validity.notes };
    },
  });

  const attempts = rendered.sections.map((section) => section.attempts);
  if (!rendered.ok || !rendered.audio) {
    const detail = rendered.sections.find((section) => !section.ok)?.notes;
    return {
      ok: false,
      message: detail || "One part of the narration did not pass the audio check. The previous recording was kept.",
      keptPrevious: rendered.keptPreviousAudio,
      plan,
      attempts,
      retrySpentUsd: rendered.retrySpentUsd,
      mock: usingMock,
    };
  }

  const validity = checkNarrationAudio({
    audio: rendered.audio,
    script: plan.script.script,
    language: plan.language,
    speed: plan.voiceSettings.speed ?? 1,
    mock: usingMock,
  });
  if (!validity.ok) {
    return {
      ok: false,
      message: validity.notes,
      keptPrevious: Boolean(input.hadPreviousAudio),
      plan,
      attempts,
      retrySpentUsd: rendered.retrySpentUsd,
      mock: usingMock,
    };
  }

  const queue = transcriptQueueDecision({
    mock: usingMock,
    budgetUsd: sttBudgetUsd(),
    estimatedUsd: usdForCharacters(plan.script.script.length, V3_USD_PER_THOUSAND_CHARS) > 0
      ? (validity.durationMs / 1000 / 60) * 0.22
      : 0,
  });
  let screen: TranscriptScreen | null = null;
  let transcriptStatus: NarrationSuccess["transcriptStatus"] = queue.status;
  let transcriptNotes = queue.note;
  if (queue.status === "mock") {
    const stt = createMockSpeechToText("echo");
    const heard = await stt.transcribe({
      audio: rendered.audio,
      language: plan.language,
      expectedScript: plan.script.script,
    });
    screen = screenTranscript(plan.script.script, heard.text, plan.language, "mock");
    transcriptStatus = screen.status === "matched" ? "matched" : screen.status === "uncertain" ? "uncertain" : "mismatch";
    transcriptNotes = `${queue.note} Mock comparison: ${screen.status}.`;
  }

  return {
    ok: true,
    audio: rendered.audio,
    plan,
    attempts,
    validity,
    transcriptStatus,
    transcriptNotes,
    screen,
    retrySpentUsd: rendered.retrySpentUsd,
    mock: usingMock,
  };
}

/** One-shot helper kept for older callers. New story audio goes through narrateWithEleven. */
export async function speakWithEleven(input: ElevenTtsInput): Promise<Buffer> {
  const result = await narrateWithEleven(input);
  if (!result.ok) throw createError(result.message, 502);
  return result.audio;
}
