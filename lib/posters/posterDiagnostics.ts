import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { posterProviderTransportFailureMessage } from "@/lib/posters/posterProviderErrors";

export type PosterFailureLogReason =
  | "missing_api_key"
  | "provider_transport"
  | "provider_timeout"
  | "content_blocked"
  | "empty_or_invalid_image"
  | "both_providers_failed"
  | "generic";

export function posterErrorLooksLikeMissingConfig(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("openai_api_key") ||
    m.includes("gemini_api_key") ||
    m.includes("gemini api key") ||
    m.includes("google_api_key") ||
    m.includes("no provider") ||
    m.includes("add openai_api_key") ||
    m.includes("set gemini_api_key") ||
    (m.includes("poster_image_provider") && m.includes("no gemini"))
  );
}

export function posterErrorLooksLikeContentBlocked(status: number, message: string): boolean {
  const m = message.toLowerCase();
  if (/blocked on the network|network blocked/i.test(m)) return false;
  return (
    status === 422 ||
    /\brai\b|safety|content policy|moderation|not allowed|inappropriate|poster image was blocked|image was blocked/i.test(
      m
    )
  );
}

/** User-facing copy for JSON `/api/poster` errors (safe, no stack traces). */
export function posterRoutePublicError(err: unknown): {
  status: number;
  error: string;
  logReason: PosterFailureLogReason;
} {
  const raw = getErrorMessage(err, "Poster image failed.");
  const st = getErrorStatus(err, 502);
  const m = raw.toLowerCase();

  if (posterErrorLooksLikeMissingConfig(raw)) {
    return {
      status: 500,
      error:
        "Image generation isn’t configured on this server. Add OPENAI_API_KEY or GEMINI_API_KEY, restart the app, and try again.",
      logReason: "missing_api_key",
    };
  }

  if (posterErrorLooksLikeContentBlocked(st, raw)) {
    return {
      status: 422,
      error:
        "This story couldn’t be turned into an image (content restrictions). Try different wording or a shorter excerpt.",
      logReason: "content_blocked",
    };
  }

  if (
    st === 503 ||
    posterProviderTransportFailureMessage(raw) ||
    /\btimed out\b|timeout\b/i.test(m)
  ) {
    const isTimeout = /\btimed out\b|timeout\b/i.test(m);
    return {
      status: 503,
      error: isTimeout
        ? "The image provider took too long to respond. Try again in a moment."
        : "Could not reach the image provider (connection issue). Check your network and try again.",
      logReason: isTimeout ? "provider_timeout" : "provider_transport",
    };
  }

  if (/empty from the ai|empty.*buffer|not a valid png/i.test(m)) {
    return {
      status: 502,
      error: "The image provider returned an empty or invalid image. Try again or shorten the story.",
      logReason: "empty_or_invalid_image",
    };
  }

  if (/failed after openai and gemini/i.test(m)) {
    return {
      status: 502,
      error:
        "Image generation failed after trying available providers. Check server logs, network, and API keys.",
      logReason: "both_providers_failed",
    };
  }

  if (st >= 400 && st < 500) {
    return {
      status: st,
      error:
        "Could not create the poster. Check your story text and try again. If it keeps failing, try again later.",
      logReason: "generic",
    };
  }

  if (st === 500) {
    return {
      status: 500,
      error:
        "Could not create the poster (server error). Confirm API keys and environment, restart the server, and try again.",
      logReason: "generic",
    };
  }

  return {
    status: 502,
    error: "Could not create the poster right now. Please try again later.",
    logReason: "generic",
  };
}

/** Short line for the poster preview card when showing genre fallback. */
export function posterFallbackHintForClient(params: {
  fetchFailed: boolean;
  status?: number;
  apiMessage?: string;
}): string {
  if (params.fetchFailed) {
    return "AI illustration was unavailable because this device could not reach your app server. On iOS/Capacitor, point the app at a running dev server (CAP_SERVER_URL + cap:sync).";
  }
  const msg = params.apiMessage ?? "";
  const st = params.status ?? 0;

  if (posterErrorLooksLikeMissingConfig(msg)) {
    return "AI illustration was unavailable: the server isn’t configured for image generation (missing API keys). Ask the developer to set OPENAI_API_KEY or GEMINI_API_KEY and restart.";
  }

  if (posterErrorLooksLikeContentBlocked(st, msg)) {
    return "AI illustration was unavailable because the image request was blocked (content safety).";
  }

  if (st === 503 || posterProviderTransportFailureMessage(msg)) {
    return "AI illustration was unavailable due to a connection issue with the image provider.";
  }

  if (/\btimed out\b|timeout\b/i.test(msg.toLowerCase())) {
    return "AI illustration was unavailable because the image provider timed out.";
  }

  if (st === 502) {
    return "AI illustration was unavailable because the provider could not be reached or completed the request.";
  }

  return "AI illustration was unavailable. Simple genre artwork is shown instead.";
}

/** Short line drawn on the fallback poster canvas (no API key nag unless configured error). */
export function posterFallbackCanvasFooterLine(apiMessage?: string): string {
  if (apiMessage && posterErrorLooksLikeMissingConfig(apiMessage)) {
    return "AI art unavailable — server needs OPENAI_API_KEY or GEMINI_API_KEY.";
  }
  return "AI illustration unavailable — simple genre artwork below.";
}
