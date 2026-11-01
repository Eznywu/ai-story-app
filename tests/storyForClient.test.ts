import assert from "node:assert/strict";
import { test } from "node:test";
import type { Story } from "../generated/prisma/client";
import { storyForClient, storySummaryForClient } from "../lib/stories/storyForClient";

const row = {
  id: "story-1",
  userId: "user-1",
  title: "Moon",
  text: "Once upon a time.",
  createdAt: new Date("2026-11-01T00:00:00Z"),
  audioFilename: "story-1.mp3",
  audioUrl: null,
  audioStorageUrl: "https://private.blob.example/voices/story-1.mp3",
  audioPrivate: true,
  posterFilename: "story-1-poster.png",
  posterUrl: null,
  illustrationFilename: null,
  illustrationUrl: null,
  coverFilename: null,
  coverUrl: null,
  artworkMeta: { estimatedCostUsd: 0.04 },
  artworkCacheKey: "art-key",
  characterSnapshot: { name: "Mia" },
  visualBrief: { scene: "burrow" },
} as unknown as Story;

test("the browser never receives the owner id, private storage location, or artwork bookkeeping", () => {
  const story = storyForClient(row) as Record<string, unknown>;
  for (const field of ["userId", "audioStorageUrl", "artworkMeta", "artworkCacheKey"]) {
    assert.equal(field in story, false, `${field} should stay on the server`);
  }
  assert.equal(story.audioUrl, "/api/audio/story-1.mp3");
  assert.equal(story.posterUrl, "/api/posters/story-1-poster.png");
  assert.equal(story.createdAt, "2026-11-01T00:00:00.000Z");
  assert.deepEqual(story.characterSnapshot, { name: "Mia" });
});

test("library rows leave out what only the reader needs", () => {
  const summary = storySummaryForClient(row) as Record<string, unknown>;
  assert.equal("characterSnapshot" in summary, false);
  assert.equal("visualBrief" in summary, false);
  assert.equal("audioStorageUrl" in summary, false);
  assert.equal(summary.title, "Moon");
});
