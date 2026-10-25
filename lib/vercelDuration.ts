/** Longest function duration we set on story, poster, and narration routes. */
export const VERCEL_FUNCTION_MAX_SECONDS = 300;

/**
 * Provider HTTP timeouts must finish before the platform kills the function,
 * so the route can return a JSON error instead of a truncated response.
 * Off Vercel the ceiling stays high for slow local networks.
 */
export function providerTimeoutMs(raw: number | undefined, fallbackMs: number, floorMs = 30_000): number {
  const requested = Number(raw);
  const base = Number.isFinite(requested) && requested > 0 ? requested : fallbackMs;
  const ceiling = process.env.VERCEL ? 240_000 : 600_000;
  return Math.min(Math.max(base, floorMs), ceiling);
}
