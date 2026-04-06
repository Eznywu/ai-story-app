/**
 * Phase 1: analytics integration points. Replace implementations when a provider is chosen.
 */
export type AnalyticsPayload = Record<string, unknown>;

const isDev = process.env.NODE_ENV === "development";

function logDev(event: string, payload?: AnalyticsPayload) {
  if (isDev && typeof console !== "undefined" && console.debug) {
    console.debug("[analytics]", event, payload ?? {});
  }
}

export function trackEvent(event: string, payload?: AnalyticsPayload) {
  logDev(event, payload);
}

export function setAnalyticsContext(_context: AnalyticsPayload) {
  logDev("context_set", _context);
}
