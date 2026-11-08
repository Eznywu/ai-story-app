import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { captureException } from "@/lib/monitoring";
import { requireUser } from "@/lib/auth/requireUser";
import { isSafeStoryId } from "@/lib/stories/storyIds";
import { mockProvidersEnabled } from "@/lib/providers/mockProviders";
import { runArtworkRequest, type ArtworkDeps, type ArtworkIntent } from "@/lib/posters/artworkService";
import { createPrismaArtworkStore } from "@/lib/posters/artworkStore";
import { generateOneIllustration } from "@/lib/posters/posterImage";
import { requestLegacyVisualBrief } from "@/lib/posters/legacyBrief";
import { posterRoutePublicError } from "@/lib/posters/posterDiagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const INTENTS = new Set<ArtworkIntent>(["create", "read", "download", "reload", "regenerate"]);

type Body = {
  title?: string;
  caption?: string;
  dedication?: string;
  storyId?: string;
  intent?: string;
  forceFallback?: boolean;
};

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const storyId = typeof body.storyId === "string" ? body.storyId.trim() : "";
    if (!isSafeStoryId(storyId)) {
      return NextResponse.json({ error: "A saved story is required before artwork is created." }, { status: 400 });
    }
    const requested = typeof body.intent === "string" ? body.intent : "create";
    if (!INTENTS.has(requested as ArtworkIntent)) {
      return NextResponse.json({ error: "That artwork action is not valid." }, { status: 400 });
    }
    const intent = requested as ArtworkIntent;
    const forceFallback = Boolean(body.forceFallback) && mockProvidersEnabled();
    const mock = mockProvidersEnabled();
    // Mock mode must not load sharp. A failed native import becomes a non-JSON 500,
    // which the story page can only show as "Poster request failed (500)".
    const compose: ArtworkDeps["compose"] = mock
      ? async (input) => input.illustration
      : (await import("@/lib/posters/composeArtwork")).composeArtworkPng;
    const transcodeToPng = mock ? undefined : (await import("@/lib/posters/composeArtwork")).transcodeImageToPng;

    const result = await runArtworkRequest(
      {
        userId: auth.user.id,
        email: auth.user.email,
        clientKey: req.headers.get("x-hh-artwork-client"),
        storyId,
        title: typeof body.title === "string" ? body.title : undefined,
        caption: typeof body.caption === "string" ? body.caption : undefined,
        dedication: typeof body.dedication === "string" ? body.dedication : undefined,
        intent,
        forceFallback,
      },
      {
        store: createPrismaArtworkStore(),
        provider: ({ prompt, referenceImage }) => generateOneIllustration(prompt, referenceImage),
        compose,
        transcodeToPng,
        legacyBrief: requestLegacyVisualBrief,
        forceFallback,
      }
    );

    return NextResponse.json(
      {
        status: result.status,
        outcome: result.outcome,
        error: result.error,
        illustrationUrl: result.illustrationUrl ?? null,
        coverUrl: result.coverUrl ?? null,
        posterUrl: result.posterUrl ?? null,
        caption: result.caption ?? null,
        dedication: result.dedication ?? null,
        cacheHit: result.cacheHit,
        providerCalls: result.providerCalls,
        attemptCount: result.attemptCount,
        estimatedCostUsd: result.estimatedCostUsd,
        costIsEstimate: true,
      },
      { status: result.httpStatus }
    );
  } catch (err: unknown) {
    captureException(err, { route: "/api/poster" });
    const detail = getErrorMessage(err, "Poster image failed.");
    const { status, error, logReason } = posterRoutePublicError(err);
    console.error("[/api/poster] failed", {
      logReason,
      httpStatus: status,
      publicError: error,
      detail: detail.slice(0, 400),
    });
    return NextResponse.json({ error }, { status });
  }
}
