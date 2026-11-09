import assert from "node:assert/strict";
import test from "node:test";
import { classifyPlayRejection, isAutoplayBlocked, showTapToHear } from "../lib/audio/autoplayHint.ts";
import { getMessages, PENDING_NATIVE_REVIEW } from "../lib/i18n/catalog.ts";
import { INTERFACE_LOCALES } from "../lib/i18n/locales.ts";
import { mockNarrationLabelVisible, storyReaderPayload } from "../lib/stories/storyReaderPayload.ts";
import type { Story } from "../generated/prisma/client";

const row = {
  id: "story-1",
  userId: "user-1",
  title: "Moon",
  text: "Once upon a time.",
  createdAt: new Date("2026-11-01T00:00:00Z"),
  audioFilename: null,
  audioUrl: "/api/audio/story-1.mp3",
  mockNarration: true,
} as unknown as Story;

test("a blocked autoplay shows the tap hint, and playback clears it", () => {
  const blocked = new DOMException("The request is not allowed by the user agent.", "NotAllowedError");
  assert.equal(isAutoplayBlocked(blocked), true);
  assert.equal(classifyPlayRejection(blocked, true), "needs-tap");
  assert.equal(showTapToHear({ needsTap: true, playing: false }), true);
  assert.equal(getMessages("en").reader.tapToHear, "Tap Play to hear the story");
  assert.equal(showTapToHear({ needsTap: true, playing: true }), false);

  const pause = new DOMException("The play() request was interrupted by a call to pause().", "AbortError");
  assert.equal(classifyPlayRejection(pause, true), "ignore-pause");
  assert.equal(isAutoplayBlocked(pause), false);

  const other = new Error("Voice failed");
  assert.equal(classifyPlayRejection(other, false), "error");
  assert.equal(showTapToHear({ needsTap: false, playing: false }), false);
});

test("the test-tone label follows only the server flag, and production never sends it", () => {
  assert.equal(mockNarrationLabelVisible(true), true);
  assert.equal(mockNarrationLabelVisible(false), false);
  assert.equal(mockNarrationLabelVisible("true"), false);
  assert.equal(mockNarrationLabelVisible(1), false);
  assert.equal(mockNarrationLabelVisible(undefined), false);

  const preview = storyReaderPayload(row, { MOCK_PROVIDERS: "1", VERCEL_ENV: "preview" });
  assert.equal(preview.mockNarration, true);
  assert.equal("mockNarration" in (preview.story as object), false);

  const off = storyReaderPayload(row, { MOCK_PROVIDERS: "0", VERCEL_ENV: "preview" });
  assert.equal(off.mockNarration, false);

  const production = storyReaderPayload(row, { MOCK_PROVIDERS: "1", VERCEL_ENV: "production" });
  assert.equal(production.mockNarration, false);
  assert.equal(mockNarrationLabelVisible(production.mockNarration), false);
  assert.equal(getMessages("en").reader.mockNarration, "Test build: narration is a test tone, not a voice");
  assert.equal(getMessages("zh-Hant").reader.mockNarration, "測試版：朗讀是測試音，不是人聲");
  assert.equal(getMessages("zh-Hant").reader.tapToHear, "點一下播放，就能聽到故事");
});

test("every interface language has the tap hint and the test-tone label", () => {
  assert.equal(INTERFACE_LOCALES.length, 10);
  const drafts = new Set(PENDING_NATIVE_REVIEW);
  for (const locale of INTERFACE_LOCALES) {
    const reader = getMessages(locale.code).reader;
    assert.ok(reader.tapToHear.trim().length > 8, locale.code);
    assert.ok(reader.mockNarration.trim().length > 8, locale.code);
    if (locale.code === "en" || locale.code === "zh-Hant" || locale.code === "zh-Hans") {
      assert.equal(drafts.has(locale.code), false);
    } else {
      assert.equal(drafts.has(locale.code), true, locale.code);
    }
  }
});
