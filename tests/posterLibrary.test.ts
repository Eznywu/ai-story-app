import assert from "node:assert/strict";
import test from "node:test";
import { libraryView } from "../lib/stories/libraryView.ts";
import {
  artworkMetaAfterIllustration,
  markPosterSaved,
  posterListing,
  posterSaveKey,
} from "../lib/stories/posterLibrary.ts";
import { storyForClient } from "../lib/stories/storyForClient.ts";
import type { Story } from "../generated/prisma/client";

const posterUrl = "/api/posters/poster_story-1.png";

test("an older keepsake stays in Posters, and a new poster waits for Save Poster", () => {
  const legacy = posterListing({ posterUrl, artworkMeta: { estimatedCostUsd: 0.02 } });
  assert.equal(legacy.inLibrary, true);
  assert.equal(legacy.legacy, true);

  const fresh = artworkMetaAfterIllustration({ estimatedCostUsd: 0.02 }, { title: "Lantern" }, true);
  assert.equal(posterListing({ posterUrl, artworkMeta: fresh }).inLibrary, false);

  const first = markPosterSaved(fresh, {
    storyId: "story-1",
    posterUrl,
    savedAt: "2026-11-09T12:00:00.000Z",
  });
  assert.equal(first.alreadySaved, false);
  const again = markPosterSaved(first.meta, {
    storyId: "story-1",
    posterUrl,
    savedAt: "2026-11-09T13:00:00.000Z",
  });
  assert.equal(again.alreadySaved, true);
  assert.equal(again.savedAt, "2026-11-09T12:00:00.000Z");
  assert.equal(again.meta.posterSaveKey, posterSaveKey("story-1", posterUrl));
  assert.equal(posterListing({ posterUrl, artworkMeta: again.meta }).inLibrary, true);
});

test("library filters count stories and saved posters without dropping audio", () => {
  const items = [
    {
      id: "old",
      text: "A saved story.",
      createdAt: "2026-11-01T00:00:00.000Z",
      audioUrl: "/api/audio/old.mp3",
      posterUrl,
      posterSaved: true,
      posterSavedAt: null,
    },
    {
      id: "new",
      text: "Another story.",
      createdAt: "2026-11-08T00:00:00.000Z",
      audioUrl: null,
      posterUrl: "/api/posters/poster_new.png",
      posterSaved: false,
      posterSavedAt: null,
    },
    {
      id: "saved-later",
      text: "Lulu finds the path.",
      createdAt: "2026-11-02T00:00:00.000Z",
      audioUrl: "/api/audio/lulu.mp3",
      posterUrl: "/api/posters/poster_lulu.png",
      posterSaved: true,
      posterSavedAt: "2026-11-09T12:00:00.000Z",
    },
  ];
  const all = libraryView(items, "all");
  assert.deepEqual(all.counts, { all: 5, stories: 3, posters: 2 });
  assert.equal(all.entries[0]?.item.id, "saved-later");
  assert.equal(all.entries[0]?.kind, "poster");
  assert.deepEqual(
    libraryView(items, "stories").entries.map((entry) => entry.item.id),
    ["new", "saved-later", "old"]
  );
  const posters = libraryView(items, "posters");
  assert.deepEqual(
    posters.entries.map((entry) => entry.item.id),
    ["saved-later", "old"]
  );
  assert.equal(posters.entries.every((entry) => entry.item.posterSaved), true);
  assert.equal(libraryView(items, "stories").entries.find((entry) => entry.item.id === "old")?.item.audioUrl, "/api/audio/old.mp3");

  const row = {
    id: "story-1",
    title: "Moon",
    text: "Once.",
    createdAt: new Date("2026-11-01T00:00:00Z"),
    posterUrl,
    posterFilename: null,
    artworkMeta: { posterLibrary: "pending" },
    userId: "user-1",
    audioStorageUrl: "secret",
  } as unknown as Story;
  const client = storyForClient(row) as Record<string, unknown>;
  assert.equal(client.posterSaved, false);
  assert.equal("artworkMeta" in client, false);
  assert.equal("userId" in client, false);
});
