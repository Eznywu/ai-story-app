/**
 * Phase 1: crash / error reporting hooks. Replace with Sentry or similar when ready.
 */

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development" && typeof console !== "undefined") {
    console.error("[monitoring]", error, context ?? {});
  }
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development" && typeof console !== "undefined") {
    console.warn("[monitoring]", message, context ?? {});
  }
}
