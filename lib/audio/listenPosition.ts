/**
 * Where a listener stopped in one story's saved narration. Kept on this device only.
 * A position is tied to the recording it was measured on, so a regenerated recording starts fresh.
 */
export type ListenPosition = { t: number; d: number; src: string };

const PREFIX = "happy-horse.listen.v1.";
/** Too close to the start or the end to be worth resuming. */
const EDGE_SECONDS = 3;

function key(storyId: string) {
  return `${PREFIX}${storyId}`;
}

function sameRecording(saved: string, current: string | null | undefined): boolean {
  if (!current) return true;
  try {
    const base = "http://listen.local";
    return new URL(saved, base).href === new URL(current, base).href;
  } catch {
    return saved === current;
  }
}

/** Returns the stored position only when it is real, mid-story, and from the story's current recording. */
export function readListenPosition(storyId: string, currentSrc?: string | null): ListenPosition | null {
  if (typeof window === "undefined" || !storyId) return null;
  try {
    const raw = window.localStorage.getItem(key(storyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListenPosition>;
    if (typeof parsed.t !== "number" || typeof parsed.d !== "number" || typeof parsed.src !== "string") return null;
    if (!Number.isFinite(parsed.t) || !Number.isFinite(parsed.d) || parsed.d <= 0) return null;
    if (parsed.t < EDGE_SECONDS || parsed.t > parsed.d - EDGE_SECONDS) return null;
    if (!sameRecording(parsed.src, currentSrc)) return null;
    return { t: parsed.t, d: parsed.d, src: parsed.src };
  } catch {
    return null;
  }
}

export function writeListenPosition(storyId: string, position: ListenPosition): void {
  if (typeof window === "undefined" || !storyId) return;
  if (!Number.isFinite(position.t) || !Number.isFinite(position.d) || position.d <= 0 || !position.src) return;
  try {
    window.localStorage.setItem(key(storyId), JSON.stringify(position));
  } catch {
    /* private mode */
  }
}

export function clearListenPosition(storyId: string): void {
  if (typeof window === "undefined" || !storyId) return;
  try {
    window.localStorage.removeItem(key(storyId));
  } catch {
    /* private mode */
  }
}
