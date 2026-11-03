import { randomUUID } from "node:crypto";
import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { mockProvidersEnabled } from "@/lib/providers/mockProviders";
import type { VoiceCloneProvider } from "./personalVoice";

export function elevenVoiceProvider(apiKey: string): VoiceCloneProvider {
  const client = new ElevenLabsClient({ apiKey });
  return {
    async createClone(input) {
      const file = new File([Buffer.from(input.bytes)], input.filename, {
        type: input.contentType || "application/octet-stream",
      });
      const result = await client.voices.ivc.create({
        name: input.name,
        files: [file],
        description: input.languageLabel.description,
        labels: JSON.stringify({
          language: input.languageLabel.language,
          accent: input.languageLabel.accent,
        }),
      });
      return {
        providerVoiceId: result.voiceId,
        requiresVerification: Boolean(result.requiresVerification),
      };
    },
    async deleteVoice(providerVoiceId) {
      await client.voices.delete(providerVoiceId);
    },
    async subscription() {
      try {
        const sub = await client.user.subscription.get();
        const record = sub as { voiceLimit?: number; voiceSlotsUsed?: number };
        const voiceLimit = typeof record.voiceLimit === "number" ? record.voiceLimit : null;
        const slotsUsed = typeof record.voiceSlotsUsed === "number" ? record.voiceSlotsUsed : null;
        return { voiceLimit, slotsUsed };
      } catch (error) {
        if (error instanceof ElevenLabsError) return { voiceLimit: null, slotsUsed: null };
        return { voiceLimit: null, slotsUsed: null };
      }
    },
  };
}

export function unavailableVoiceProvider(): VoiceCloneProvider {
  return {
    async createClone() {
      throw new Error("Voice cloning needs an ElevenLabs API key. Set ELEVENLABS_API_KEY and try again.");
    },
    async deleteVoice() {
      throw new Error("The voice service is not configured, so the cloned voice could not be deleted yet.");
    },
    async subscription() {
      return { voiceLimit: null, slotsUsed: null };
    },
  };
}

/** Local testing only: a clone that never leaves this machine. Its previews stay unavailable, not faked. */
export function mockVoiceProvider(): VoiceCloneProvider {
  return {
    async createClone() {
      return { providerVoiceId: `mock${randomUUID().replace(/-/g, "")}`, requiresVerification: false };
    },
    async deleteVoice() {},
    async subscription() {
      return { voiceLimit: null, slotsUsed: null };
    },
  };
}

export function voiceProviderFromEnv(env: NodeJS.ProcessEnv = process.env): VoiceCloneProvider {
  if (mockProvidersEnabled(env)) return mockVoiceProvider();
  const key = env.ELEVENLABS_API_KEY?.trim();
  if (!key) return unavailableVoiceProvider();
  return elevenVoiceProvider(key);
}
