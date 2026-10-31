import { sniffImageMime, type ImageMime } from "@/lib/posters/imageBytes";
import { artworkCacheKey } from "@/lib/posters/artworkCacheKey";
import { artworkCapsFromEnv, artworkScopeKey, utcDayKey, type ArtworkCaps } from "@/lib/posters/artworkLimits";
import {
  PRODUCTION_IMAGE_MODEL,
  PRODUCTION_IMAGE_PROVIDER,
  PRODUCTION_IMAGE_QUALITY,
  PRODUCTION_IMAGE_SIZE,
  estimatedImageUsd,
  selectedImageProvider,
} from "@/lib/posters/artworkPricing";
import { buildArtworkPrompt } from "@/lib/posters/artworkPrompt";
import { parseAudienceAge } from "@/lib/posters/audienceAge";
import {
  buildCharacterSnapshot,
  readCharacterSnapshot,
  type CharacterSnapshot,
} from "@/lib/posters/characterSnapshot";
import { deriveVisualBrief, validateVisualBrief, type VisualBrief } from "@/lib/posters/visualBrief";

export type ArtworkIntent = "create" | "read" | "download" | "reload" | "regenerate";

export type ArtworkStatus = "pending" | "illustrated" | "fallback" | "error";

export type ImageUsage = { inputTokens?: number; outputTokens?: number };

export type ArtworkStoryRow = {
  id: string;
  userId: string | null;
  title: string;
  genre: string;
  text: string;
  age: string | null;
  language: string | null;
  mainCharacterName: string | null;
  childGender: string | null;
  characterSnapshot: unknown;
  visualBrief: unknown;
  illustrationUrl: string | null;
  coverUrl: string | null;
  posterUrl: string | null;
  artworkStatus: string | null;
  artworkCacheKey: string | null;
  posterCaption: string | null;
  dedication: string | null;
  artworkMeta: unknown;
};

export type ArtworkJobRow = {
  cacheKey: string;
  scopeKey: string;
  storyId: string;
  status: ArtworkStatus;
  leaseUntil: number | null;
  blockedUntil: number | null;
  attemptCount: number;
  estimatedCostUsd: number;
  illustrationBytes: Buffer | null;
  illustrationUrl: string | null;
  coverUrl: string | null;
  posterUrl: string | null;
  errorMessage: string | null;
};

export type ArtworkStore = {
  getStory(userId: string, storyId: string): Promise<ArtworkStoryRow | null>;
  saveBrief(storyId: string, brief: VisualBrief): Promise<void>;
  findJob(cacheKey: string): Promise<ArtworkJobRow | null>;
  /** Unique cache key. A second instance gets "exists" instead of a second row. */
  insertPending(job: ArtworkJobRow): Promise<"inserted" | "exists">;
  takeLease(cacheKey: string, until: number): Promise<boolean>;
  reserveSpend(input: {
    scopeKey: string;
    dayKey: string;
    estimateUsd: number;
    caps: ArtworkCaps;
  }): Promise<boolean>;
  saveSuccess(input: {
    storyId: string;
    cacheKey: string;
    illustration: Buffer;
    cover: Buffer;
    poster: Buffer;
    caption: string;
    dedication: string;
    meta: Record<string, unknown>;
  }): Promise<{ illustrationUrl: string; coverUrl: string; posterUrl: string }>;
  saveTerminal(input: {
    storyId: string;
    cacheKey: string;
    status: "fallback" | "error";
    message: string;
    blockedUntil: number | null;
    meta: Record<string, unknown>;
    cover?: Buffer;
    poster?: Buffer;
  }): Promise<{ coverUrl: string | null; posterUrl: string | null }>;
  readIllustration(storyId: string): Promise<Buffer | null>;
};

export type ImageProviderResult = {
  bytes: Buffer;
  claimedMime?: string | null;
  model: string;
  quality: string;
  provider: string;
  size: string;
  usage?: ImageUsage | null;
};

export type ArtworkDeps = {
  store: ArtworkStore;
  now?: () => number;
  provider: (input: { prompt: string }) => Promise<ImageProviderResult>;
  compose: (input: {
    illustration: Buffer;
    kind: "cover" | "keepsake";
    title: string;
    caption: string;
    dedication: string;
  }) => Promise<Buffer>;
  transcodeToPng?: (bytes: Buffer, mime: ImageMime) => Promise<Buffer>;
  legacyBrief?: (story: ArtworkStoryRow) => Promise<unknown>;
  env?: NodeJS.ProcessEnv;
  /** When true, skip the provider and store a simple fallback. Tests and mock mode only. */
  forceFallback?: boolean;
};

export type ArtworkResponse = {
  ok: boolean;
  httpStatus: number;
  status: ArtworkStatus | "rejected";
  outcome: "illustrated" | "text_fallback" | "none";
  error?: string;
  illustrationUrl?: string | null;
  coverUrl?: string | null;
  posterUrl?: string | null;
  caption?: string;
  dedication?: string;
  cacheHit: boolean;
  providerCalls: number;
  attemptCount: number;
  estimatedCostUsd: number;
  costIsEstimate: true;
};

function metaOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function captionFrom(brief: VisualBrief, story: ArtworkStoryRow): string {
  return (story.posterCaption ?? "").trim() || brief.moment;
}

function dedicationFrom(story: ArtworkStoryRow): string {
  const saved = (story.dedication ?? "").trim();
  if (saved) return saved;
  const name = story.mainCharacterName?.trim();
  return name ? `For ${name}` : "";
}

function possiblyBillable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (/missing api key|not configured|poster_image_provider/i.test(message)) return false;
  return true;
}

function isTimeout(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timed out|timeout|etimedout|abort/i.test(message);
}

async function resolveBrief(
  story: ArtworkStoryRow,
  character: CharacterSnapshot,
  deps: ArtworkDeps
): Promise<VisualBrief> {
  const audience = parseAudienceAge(story.age);
  const existing = validateVisualBrief(story.visualBrief, audience.band);
  if (existing) return existing;

  const legacyOn = deps.env?.ARTWORK_LEGACY_BRIEF === "1";
  if (legacyOn && deps.legacyBrief) {
    try {
      const raw = await deps.legacyBrief(story);
      const parsed = validateVisualBrief(raw, audience.band);
      if (parsed) {
        await deps.store.saveBrief(story.id, parsed);
        return parsed;
      }
    } catch {
      /* A failed text call must not discard the story. Derive a brief instead. */
    }
  }

  const derived = deriveVisualBrief({
    title: story.title,
    story: story.text,
    genre: story.genre,
    age: story.age,
    character,
  });
  await deps.store.saveBrief(story.id, derived);
  return derived;
}

function characterFor(story: ArtworkStoryRow): CharacterSnapshot {
  return (
    readCharacterSnapshot(story.characterSnapshot) ??
    buildCharacterSnapshot({
      name: story.mainCharacterName,
      childGender: story.childGender,
      type: story.childGender && story.childGender !== "any" ? "human child" : "story character",
    })
  );
}

async function pngBytes(
  bytes: Buffer,
  claimed: string | null | undefined,
  deps: ArtworkDeps
): Promise<Buffer> {
  const sniffed = sniffImageMime(bytes);
  if (!sniffed) {
    throw new Error("Illustration bytes are not a PNG, JPEG, or WebP image.");
  }
  const claim = (claimed ?? "").toLowerCase();
  if (claim && claim !== sniffed && !(claim === "image/jpg" && sniffed === "image/jpeg")) {
    throw new Error("Illustration MIME type does not match the image bytes.");
  }
  if (sniffed === "image/png") return bytes;
  if (!deps.transcodeToPng) {
    throw new Error("Illustration must be converted to PNG before it can be saved.");
  }
  return deps.transcodeToPng(bytes, sniffed);
}

export async function runArtworkRequest(
  input: {
    userId: string;
    email: string;
    clientKey?: string | null;
    storyId: string;
    title?: string;
    caption?: string;
    dedication?: string;
    intent: ArtworkIntent;
    forceFallback?: boolean;
  },
  deps: ArtworkDeps
): Promise<ArtworkResponse> {
  const now = deps.now ?? Date.now;
  const env = deps.env ?? process.env;
  const providerName = selectedImageProvider(env);
  const model =
    providerName === "gemini"
      ? env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-lite-image"
      : env.OPENAI_POSTER_IMAGE_MODEL?.trim() || PRODUCTION_IMAGE_MODEL;
  const quality =
    providerName === "gemini"
      ? "1K"
      : env.OPENAI_POSTER_IMAGE_QUALITY?.trim().toLowerCase() || PRODUCTION_IMAGE_QUALITY;
  const size = PRODUCTION_IMAGE_SIZE;
  let providerCalls = 0;

  const story = await deps.store.getStory(input.userId, input.storyId);
  if (!story) {
    return {
      ok: false,
      httpStatus: 404,
      status: "rejected",
      outcome: "none",
      error: "Story not found.",
      cacheHit: false,
      providerCalls: 0,
      attemptCount: 0,
      estimatedCostUsd: 0,
      costIsEstimate: true,
    };
  }

  const title = (input.title ?? story.title).trim() || "Happy Horse";
  const character = characterFor(story);
  const audience = parseAudienceAge(story.age);
  const brief = await resolveBrief(story, character, deps);
  const caption = (input.caption ?? "").trim() || captionFrom(brief, story);
  const dedication = input.dedication !== undefined ? input.dedication.trim() : dedicationFrom(story);
  const cacheKey = artworkCacheKey({
    userId: input.userId,
    storyId: story.id,
    brief,
    character,
    audience,
    genre: story.genre,
    provider: providerName,
    model,
    quality,
    size,
  });
  const scopeKey = artworkScopeKey({
    userId: input.userId,
    email: input.email,
    clientKey: input.clientKey,
  });

  const reuseWithoutProvider = async (job: ArtworkJobRow | null): Promise<ArtworkResponse | null> => {
    const illustration = job?.illustrationBytes ?? (await deps.store.readIllustration(story.id));
    const hasArt = Boolean(illustration && illustration.length);
    const illustrated =
      (job?.status === "illustrated" || story.artworkStatus === "illustrated") && hasArt && illustration;
    if (!illustrated) return null;
    const overlayChanged =
      title !== story.title ||
      caption !== (story.posterCaption ?? "") ||
      dedication !== (story.dedication ?? "");
    if (!overlayChanged && story.coverUrl && story.posterUrl && input.intent !== "regenerate") {
      return {
        ok: true,
        httpStatus: 200,
        status: "illustrated",
        outcome: "illustrated",
        illustrationUrl: story.illustrationUrl,
        coverUrl: story.coverUrl,
        posterUrl: story.posterUrl,
        caption,
        dedication,
        cacheHit: true,
        providerCalls,
        attemptCount: job?.attemptCount ?? 0,
        estimatedCostUsd: 0,
        costIsEstimate: true,
      };
    }
    const cover = await deps.compose({ illustration, kind: "cover", title, caption, dedication });
    const poster = await deps.compose({ illustration, kind: "keepsake", title, caption, dedication });
    const saved = await deps.store.saveSuccess({
      storyId: story.id,
      cacheKey,
      illustration,
      cover,
      poster,
      caption,
      dedication,
      meta: {
        ...metaOf(story.artworkMeta),
        title,
        cacheHit: true,
        provider: providerName,
        model,
        quality,
        size,
        recomposed: true,
      },
    });
    return {
      ok: true,
      httpStatus: 200,
      status: "illustrated",
      outcome: "illustrated",
      ...saved,
      caption,
      dedication,
      cacheHit: true,
      providerCalls,
      attemptCount: job?.attemptCount ?? 0,
      estimatedCostUsd: 0,
      costIsEstimate: true,
    };
  };

  const job = await deps.store.findJob(cacheKey);
  const readOnly = input.intent === "read" || input.intent === "download" || input.intent === "reload";

  if (readOnly) {
    const reused = await reuseWithoutProvider(job);
    if (reused) return reused;
    const status = story.artworkStatus === "fallback" || story.artworkStatus === "error" ? story.artworkStatus : "error";
    return {
      ok: status !== "error",
      httpStatus: 200,
      status,
      outcome: status === "fallback" ? "text_fallback" : "none",
      error: "Saved artwork could not be loaded. Creating new artwork is a separate action.",
      illustrationUrl: story.illustrationUrl,
      coverUrl: story.coverUrl,
      posterUrl: story.posterUrl,
      caption,
      dedication,
      cacheHit: false,
      providerCalls: 0,
      attemptCount: job?.attemptCount ?? 0,
      estimatedCostUsd: 0,
      costIsEstimate: true,
    };
  }

  const reused = await reuseWithoutProvider(job);
  if (reused && input.intent !== "regenerate") return reused;
  if (reused && input.intent === "regenerate" && job?.status === "illustrated") return reused;

  const blocked = job?.blockedUntil && job.blockedUntil > now();
  if (blocked && input.intent !== "regenerate") {
    return {
      ok: true,
      httpStatus: 200,
      status: story.artworkStatus === "error" ? "error" : "fallback",
      outcome: "text_fallback",
      error: job?.errorMessage || "The last image request may already have been billed. Try again later.",
      coverUrl: story.coverUrl,
      posterUrl: story.posterUrl,
      caption,
      dedication,
      cacheHit: false,
      providerCalls: 0,
      attemptCount: job?.attemptCount ?? 0,
      estimatedCostUsd: 0,
      costIsEstimate: true,
    };
  }

  if (job?.status === "pending" && job.leaseUntil && job.leaseUntil > now()) {
    return {
      ok: true,
      httpStatus: 202,
      status: "pending",
      outcome: "none",
      cacheHit: false,
      providerCalls: 0,
      attemptCount: job.attemptCount,
      estimatedCostUsd: 0,
      costIsEstimate: true,
    };
  }

  if (deps.forceFallback) {
    const saved = await deps.store.saveTerminal({
      storyId: story.id,
      cacheKey,
      status: "fallback",
      message: "Illustrated artwork was unavailable. This keepsake is a simple cover, not AI artwork.",
      blockedUntil: null,
      meta: { provider: providerName, model, quality, size, providerCalls: 0, cacheHit: false },
    });
    return {
      ok: true,
      httpStatus: 200,
      status: "fallback",
      outcome: "text_fallback",
      error: "Illustrated artwork was unavailable. This keepsake is a simple cover, not AI artwork.",
      ...saved,
      caption,
      dedication,
      cacheHit: false,
      providerCalls: 0,
      attemptCount: 0,
      estimatedCostUsd: 0,
      costIsEstimate: true,
    };
  }

  const caps = artworkCapsFromEnv(env);
  const attemptsSoFar = job?.attemptCount ?? 0;
  if (attemptsSoFar >= caps.maxAttempts && input.intent !== "regenerate") {
    return {
      ok: false,
      httpStatus: 429,
      status: "error",
      outcome: "none",
      error: "This artwork already used its image attempt.",
      cacheHit: false,
      providerCalls: 0,
      attemptCount: attemptsSoFar,
      estimatedCostUsd: 0,
      costIsEstimate: true,
    };
  }

  const inserted = await deps.store.insertPending({
    cacheKey,
    scopeKey,
    storyId: story.id,
    status: "pending",
    leaseUntil: now() + 120_000,
    blockedUntil: null,
    attemptCount: job?.attemptCount ?? 0,
    estimatedCostUsd: job?.estimatedCostUsd ?? 0,
    illustrationBytes: null,
    illustrationUrl: null,
    coverUrl: null,
    posterUrl: null,
    errorMessage: null,
  });
  if (inserted === "exists") {
    const current = await deps.store.findJob(cacheKey);
    if (current?.status === "illustrated") {
      const again = await reuseWithoutProvider(current);
      if (again) return again;
    }
    if (current?.status === "pending" && current.leaseUntil && current.leaseUntil > now()) {
      return {
        ok: true,
        httpStatus: 202,
        status: "pending",
        outcome: "none",
        cacheHit: false,
        providerCalls: 0,
        attemptCount: current.attemptCount,
        estimatedCostUsd: 0,
        costIsEstimate: true,
      };
    }
    const leased = await deps.store.takeLease(cacheKey, now() + 120_000);
    if (!leased) {
      return {
        ok: true,
        httpStatus: 202,
        status: "pending",
        outcome: "none",
        cacheHit: false,
        providerCalls: 0,
        attemptCount: current?.attemptCount ?? 0,
        estimatedCostUsd: 0,
        costIsEstimate: true,
      };
    }
  }

  const estimate = estimatedImageUsd({ quality });
  const reserved = await deps.store.reserveSpend({
    scopeKey,
    dayKey: utcDayKey(new Date(now())),
    estimateUsd: estimate,
    caps,
  });
  if (!reserved) {
    await deps.store.saveTerminal({
      storyId: story.id,
      cacheKey,
      status: "error",
      message: "Today's artwork limit has been reached.",
      blockedUntil: null,
      meta: { provider: providerName, model, quality, size, limit: "spend" },
    });
    return {
      ok: false,
      httpStatus: 429,
      status: "error",
      outcome: "none",
      error: "Today's artwork limit has been reached.",
      cacheHit: false,
      providerCalls: 0,
      attemptCount: attemptsSoFar,
      estimatedCostUsd: 0,
      costIsEstimate: true,
    };
  }

  const prompt = buildArtworkPrompt({ audience, character, brief, genre: story.genre });
  const started = now();
  try {
    providerCalls += 1;
    const image = await deps.provider({ prompt });
    const png = await pngBytes(image.bytes, image.claimedMime, deps);
    const spent = estimatedImageUsd({ quality: image.quality || quality, usage: image.usage });
    const cover = await deps.compose({ illustration: png, kind: "cover", title, caption, dedication });
    const poster = await deps.compose({ illustration: png, kind: "keepsake", title, caption, dedication });
    const saved = await deps.store.saveSuccess({
      storyId: story.id,
      cacheKey,
      illustration: png,
      cover,
      poster,
      caption,
      dedication,
      meta: {
        title,
        provider: image.provider || providerName,
        model: image.model || model,
        quality: image.quality || quality,
        size: image.size || size,
        width: 1024,
        height: 1024,
        latencyMs: Math.max(0, now() - started),
        usage: image.usage ?? null,
        estimatedCostUsd: spent,
        costIsEstimate: true,
        cacheHit: false,
        attemptCount: attemptsSoFar + 1,
        promptVersion: "ab13-1",
      },
    });
    return {
      ok: true,
      httpStatus: 200,
      status: "illustrated",
      outcome: "illustrated",
      ...saved,
      caption,
      dedication,
      cacheHit: false,
      providerCalls,
      attemptCount: attemptsSoFar + 1,
      estimatedCostUsd: spent,
      costIsEstimate: true,
    };
  } catch (error: unknown) {
    const billable = possiblyBillable(error);
    const timeout = isTimeout(error);
    const message = timeout
      ? "The image provider timed out. That request may already have been billed, so it was not retried."
      : error instanceof Error
        ? error.message
        : "Poster image failed.";
    await deps.store.saveTerminal({
      storyId: story.id,
      cacheKey,
      status: billable ? "fallback" : "error",
      message,
      blockedUntil: billable ? now() + 15 * 60_000 : null,
      meta: {
        provider: providerName,
        model,
        quality,
        size,
        latencyMs: Math.max(0, now() - started),
        estimatedCostUsd: billable ? estimate : 0,
        costIsEstimate: true,
        cacheHit: false,
        attemptCount: attemptsSoFar + providerCalls,
        billable,
        timeout,
      },
    });
    return {
      ok: billable,
      httpStatus: billable ? 200 : 500,
      status: billable ? "fallback" : "error",
      outcome: billable ? "text_fallback" : "none",
      error: message,
      caption,
      dedication,
      cacheHit: false,
      providerCalls,
      attemptCount: attemptsSoFar + providerCalls,
      estimatedCostUsd: billable ? estimate : 0,
      costIsEstimate: true,
    };
  }
}

export const artworkProductionDefaults = {
  provider: PRODUCTION_IMAGE_PROVIDER,
  model: PRODUCTION_IMAGE_MODEL,
  quality: PRODUCTION_IMAGE_QUALITY,
  size: PRODUCTION_IMAGE_SIZE,
};
