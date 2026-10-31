import { inspectMp3, type Mp3Inspection } from "./mp3Inspect";

export type AudioValidity = {
  ok: boolean;
  status: "valid" | "invalid" | "mock";
  durationCheck: "pass" | "fail" | "skipped_mock";
  truncated: boolean;
  durationMs: number;
  expectedMs: number;
  notes: string;
  inspection: Mp3Inspection;
};

export function expectedDurationMs(script: string, language: string, speed: number): number {
  const spoken = script.replace(/\s+/g, "");
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const charsPerSecond = (language.toLowerCase().startsWith("zh") ? 4 : 13) * safeSpeed;
  if (!spoken.length) return 0;
  return Math.max(400, Math.round((spoken.length / charsPerSecond) * 1000));
}

export function checkNarrationAudio(input: {
  audio: Buffer;
  script: string;
  language: string;
  speed: number;
  mock: boolean;
}): AudioValidity {
  const inspection = inspectMp3(input.audio);
  const expectedMs = expectedDurationMs(input.script, input.language, input.speed);
  if (!inspection.valid) {
    return {
      ok: false,
      status: "invalid",
      durationCheck: "fail",
      truncated: inspection.truncated,
      durationMs: inspection.durationMs,
      expectedMs,
      notes: inspection.notes,
      inspection,
    };
  }
  if (input.mock) {
    return {
      ok: true,
      status: "mock",
      durationCheck: "skipped_mock",
      truncated: false,
      durationMs: inspection.durationMs,
      expectedMs,
      notes: `${inspection.notes} Duration was not compared with the script because this is the shared mock recording.`,
      inspection,
    };
  }
  const ratio = expectedMs > 0 ? inspection.durationMs / expectedMs : 1;
  const durationOk = ratio >= 0.4 && ratio <= 2.5;
  return {
    ok: durationOk,
    status: durationOk ? "valid" : "invalid",
    durationCheck: durationOk ? "pass" : "fail",
    truncated: !durationOk && ratio < 0.4,
    durationMs: inspection.durationMs,
    expectedMs,
    notes: durationOk
      ? `${inspection.notes} Length is in the expected range.`
      : `The recording is ${inspection.durationMs} ms and the script expected about ${expectedMs} ms. It was not kept.`,
    inspection,
  };
}
