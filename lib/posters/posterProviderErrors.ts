import { getErrorMessage, getErrorStatus } from "@/lib/errors";

/**
 * Transient transport / connectivity hints (OpenAI SDK, fetch, Google).
 * Used for client-side genre fallback and server-side auto OpenAI → Gemini retry.
 */
export function posterProviderTransportFailureMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /\bconnection error\b/.test(m) ||
    /connection\s*(reset|refused|aborted|closed|timeout)/i.test(m) ||
    /timed out|blocked on the network|generativelanguage\.googleapis|api\.openai\.com|openai timed out/.test(m) ||
    /econnrefused|econnreset|etimedout|enotfound|fetch failed|connect\s*timeout|connect timeout/.test(m) ||
    /socket\s*(hang\s*up|closed)|network(\s*error)?|und_err_/i.test(m)
  );
}

/** True when failing over to another image provider (or genre fallback) is appropriate. */
export function isRecoverablePosterProviderConnectivityFailure(error: unknown): boolean {
  const status = getErrorStatus(error, 0);
  const msg = getErrorMessage(error, "");

  if (status === 503) return true;
  if (status === 401 || status === 403 || status === 422 || status === 400) return false;

  if (!posterProviderTransportFailureMessage(msg)) return false;

  // Transport-shaped messages: retry/fallback unless it's clearly a non-network HTTP error we mapped.
  if (status === 429) return false;

  return true;
}
