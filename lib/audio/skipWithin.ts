/**
 * Move `current` by `deltaSeconds` and stay inside the clip.
 * An unknown or empty duration clamps to 0 so the clock cannot run past a missing file.
 */
export function skipWithin(current: number, deltaSeconds: number, duration: number): number {
  const start = Number.isFinite(current) ? current : 0;
  const delta = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;
  const limit = Number.isFinite(duration) && duration > 0 ? duration : 0;
  return Math.min(Math.max(0, start + delta), limit || 0);
}
