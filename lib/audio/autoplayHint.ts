export type PlayRejection = "ignore-pause" | "needs-tap" | "error";

/** A browser refused play() because this call was not from a tap. */
export function isAutoplayBlocked(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

/**
 * How the reader treats a rejected play() promise.
 * NotAllowedError asks for a tap. A pause that interrupted play is ignored.
 * Every other rejection keeps the existing error message.
 */
export function classifyPlayRejection(error: unknown, paused: boolean): PlayRejection {
  const message = error instanceof Error ? error.message : String(error);
  if (paused && /interrupted by a call to pause/i.test(message)) return "ignore-pause";
  if (isAutoplayBlocked(error)) return "needs-tap";
  return "error";
}

/** The tap hint stays up until playback actually starts. */
export function showTapToHear(input: { needsTap: boolean; playing: boolean }): boolean {
  return input.needsTap && !input.playing;
}
