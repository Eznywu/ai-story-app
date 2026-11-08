import assert from "node:assert/strict";
import test from "node:test";
import { coverCandidates, coverFit, pickCover } from "../lib/stories/storyCover";
import { clearListenPosition, readListenPosition, writeListenPosition } from "../lib/audio/listenPosition";

test("the player cover prefers the square cover, then the square illustration, then the portrait keepsake", () => {
  const story = {
    coverUrl: "/api/posters/cover_a.png",
    illustrationUrl: "/api/posters/illustration_a.png",
    posterUrl: "/api/posters/poster_a.png",
  };
  assert.deepEqual(
    coverCandidates(story).map((item) => [item.kind, item.shape]),
    [
      ["cover", "square"],
      ["illustration", "square"],
      ["poster", "portrait"],
    ]
  );
  assert.equal(pickCover(story, new Set([story.coverUrl]))?.kind, "illustration");
  assert.equal(pickCover(story, new Set([story.coverUrl, story.illustrationUrl]))?.kind, "poster");
  assert.equal(pickCover(story, new Set(Object.values(story))), null);
  assert.deepEqual(pickCover({ posterUrl: "/api/posters/poster_old.png" }), {
    url: "/api/posters/poster_old.png",
    kind: "poster",
    shape: "portrait",
  });
  assert.equal(pickCover({ coverUrl: " ", illustrationUrl: null }), null);
});

test("only a square picture fills the square; a 4:5 keepsake is contained, never stretched", () => {
  assert.equal(coverFit(1080, 1080), "fill");
  assert.equal(coverFit(1024, 1024), "fill");
  assert.equal(coverFit(1080, 1100), "fill");
  assert.equal(coverFit(1080, 1350), "contain");
  assert.equal(coverFit(1536, 1024), "contain");
  assert.equal(coverFit(0, 0), "contain");
});

test("a listening position resumes only on the same recording and only mid-story", () => {
  const store = new Map<string, string>();
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
  try {
    writeListenPosition("s1", { t: 42.5, d: 135, src: "/api/audio/a.mp3" });
    assert.deepEqual(readListenPosition("s1", "/api/audio/a.mp3"), { t: 42.5, d: 135, src: "/api/audio/a.mp3" });
    assert.deepEqual(readListenPosition("s1", "http://listen.local/api/audio/a.mp3")?.t, 42.5);
    assert.equal(readListenPosition("s1", "/api/audio/regenerated.mp3"), null);
    writeListenPosition("s2", { t: 1, d: 135, src: "/api/audio/b.mp3" });
    assert.equal(readListenPosition("s2", "/api/audio/b.mp3"), null);
    writeListenPosition("s3", { t: 133.5, d: 135, src: "/api/audio/c.mp3" });
    assert.equal(readListenPosition("s3", "/api/audio/c.mp3"), null);
    store.set("happy-horse.listen.v1.s4", "{not json");
    assert.equal(readListenPosition("s4", null), null);
    clearListenPosition("s1");
    assert.equal(readListenPosition("s1", "/api/audio/a.mp3"), null);
  } finally {
    (globalThis as { window?: unknown }).window = previous;
  }
});
