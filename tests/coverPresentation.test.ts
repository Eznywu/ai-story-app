import assert from "node:assert/strict";
import test from "node:test";
import {
  COVER_LOAD_FAILED,
  coverImageUnreadable,
  coverPresentation,
  sameMediaUrl,
} from "../lib/stories/coverPresentation.ts";

test("sameMediaUrl treats a relative poster path and its absolute form as one file", () => {
  assert.equal(sameMediaUrl("/api/posters/cover.png", "/api/posters/cover.png"), true);
  assert.equal(
    sameMediaUrl("/api/posters/cover.png", "http://cover.local/api/posters/cover.png"),
    true
  );
  assert.equal(sameMediaUrl("/api/posters/a.png", "/api/posters/b.png"), false);
});

test("a saved cover that fails to load shows fallback art and retry, not the broken image", () => {
  const poster = {
    status: "ready" as const,
    url: "/api/posters/missing.png",
    outcome: "illustrated" as const,
  };
  assert.equal(coverImageUnreadable(poster, poster.url), true);
  const view = coverPresentation(poster, poster.url);
  assert.equal(view.showImage, false);
  assert.equal(view.showFallbackArt, true);
  assert.equal(view.showRetry, true);
  assert.equal(view.message, COVER_LOAD_FAILED);
});

test("a broken URL does not hide a different cover that replaced it", () => {
  const view = coverPresentation(
    { status: "ready", url: "/api/posters/new.png", outcome: "illustrated" },
    "/api/posters/old.png"
  );
  assert.equal(view.showImage, true);
  assert.equal(view.imageUrl, "/api/posters/new.png");
  assert.equal(view.showRetry, false);
  assert.equal(view.message, null);
});

test("illustrated, fallback, generating, and error covers stay distinct", () => {
  const ready = coverPresentation(
    { status: "ready", url: "/api/posters/ok.png", outcome: "illustrated" },
    null
  );
  assert.equal(ready.showImage, true);
  assert.equal(ready.showRetry, false);

  const simple = coverPresentation(
    { status: "ready", url: "/api/posters/simple.png", outcome: "text_fallback" },
    null
  );
  assert.equal(simple.showImage, true);
  assert.match(simple.message || "", /Simple cover/);
  assert.equal(simple.showRetry, true);

  const painting = coverPresentation({ status: "generating" }, null);
  assert.equal(painting.showImage, false);
  assert.equal(painting.showFallbackArt, true);
  assert.equal(painting.showRetry, false);

  const failed = coverPresentation({ status: "error", message: "Poster could not be created." }, null);
  assert.equal(failed.showImage, false);
  assert.equal(failed.message, "Poster could not be created.");
  assert.equal(failed.showRetry, true);
});

test("a text fallback whose file also fails to load prefers the load-failure message", () => {
  const view = coverPresentation(
    { status: "ready", url: "/api/posters/simple.png", outcome: "text_fallback" },
    "/api/posters/simple.png"
  );
  assert.equal(view.showImage, false);
  assert.equal(view.message, COVER_LOAD_FAILED);
  assert.equal(view.showRetry, true);
});
