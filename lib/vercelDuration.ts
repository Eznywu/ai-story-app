/**
 * Longest function duration on story, poster, and narration routes.
 * Those routes must export `maxDuration = 300` as a literal. Next.js 16
 * rejects a segment config value that is imported from another module.
 */
export const VERCEL_FUNCTION_MAX_SECONDS = 300;

/**
 * Provider HTTP timeouts must finish before the platform kills the function,
 * so the route can return a JSON error instead of a truncated response.
 * Off Vercel the ceiling stays high for slow local networks.
 */
export function providerTimeoutMs(raw: number | undefined, fallbackMs: number, floorMs = 30_000): number {
  const requested = Number(raw);
  const base = Number.isFinite(requested) && requested > 0 ? requested : fallbackMs;
  const vercelCeilingMs = (VERCEL_FUNCTION_MAX_SECONDS - 60) * 1000;
  const ceiling = process.env.VERCEL ? vercelCeilingMs : 600_000;
  return Math.min(Math.max(base, floorMs), ceiling);
}
