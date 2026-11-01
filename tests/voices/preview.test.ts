import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  STAND_IN_TONE_SHA256,
  audioFingerprint,
  cachedPreviewUsable,
  checkPreviewAudio,
  isServablePreviewSource,
} from "../../lib/voices/previewAudio";
import { isLibrarySampleUrl, librarySample, DEFAULT_NARRATORS } from "../../lib/voices/registry";
import { previewFailureMessage } from "../../app/hooks/useVoicePreview";

const tone = readFileSync("lib/providers/fixtures/mock-narration.mp3");

/** MPEG-1 Layer III, 128 kbps, 44.1 kHz frames: 417 bytes and 1152 samples each. Header-valid, silent payload. */
function frames(seconds: number): Buffer {
  const count = Math.round((seconds * 44100) / 1152);
  const frame = Buffer.alloc(417);
  frame.set([0xff, 0xfb, 0x90, 0xc4]);
  return Buffer.concat(Array.from({ length: count }, () => frame));
}

test("the stand-in tone is recognised by its fingerprint and refused as a preview", () => {
  assert.equal(audioFingerprint(tone), STAND_IN_TONE_SHA256);
  assert.deepEqual(checkPreviewAudio(tone), { ok: false, problem: "stand_in" });
});

test("a preview must be a whole MP3 of speech length", () => {
  assert.deepEqual(checkPreviewAudio(Buffer.alloc(0)), { ok: false, problem: "empty" });
  assert.deepEqual(checkPreviewAudio(Buffer.from('{"error":"nope"}')), { ok: false, problem: "not_mp3" });
  assert.deepEqual(checkPreviewAudio(frames(0.5)), { ok: false, problem: "too_short" });
  assert.deepEqual(checkPreviewAudio(frames(60)), { ok: false, problem: "too_long" });
  const cut = frames(5).subarray(0, 417 * 100 + 200);
  assert.deepEqual(checkPreviewAudio(cut), { ok: false, problem: "not_mp3" });
  const whole = checkPreviewAudio(frames(5));
  assert.equal(whole.ok, true);
  if (whole.ok) assert.ok(Math.abs(whole.durationMs - 5000) < 50);
});

test("only real library or generated clips that still pass the check are replayed from the cache", () => {
  const clip = frames(6);
  assert.equal(isServablePreviewSource("library"), true);
  assert.equal(isServablePreviewSource("generated"), true);
  assert.equal(isServablePreviewSource("mock"), false);
  assert.equal(cachedPreviewUsable("mock", clip), false);
  assert.equal(cachedPreviewUsable("generated", tone), false);
  assert.equal(cachedPreviewUsable("library", null), false);
  assert.equal(cachedPreviewUsable("library", clip), true);
  assert.equal(cachedPreviewUsable("generated", clip), true);
});

test("library samples come from the Voice Library hosts and match the requested language", () => {
  for (const voice of DEFAULT_NARRATORS) {
    for (const language of ["en", "zh-Hant"] as const) {
      const sample = librarySample(voice, language);
      if (!voice.previewUrl[language]) {
        assert.equal(sample, null, `${voice.id} ${language}`);
        continue;
      }
      assert.ok(sample, `${voice.id} ${language}`);
      assert.equal(sample?.url, voice.previewUrl[language]);
      assert.ok(sample?.modelId, `${voice.id} ${language} model`);
    }
  }
  assert.equal(isLibrarySampleUrl("https://storage.googleapis.com/eleven-public-prod/a.mp3"), true);
  assert.equal(isLibrarySampleUrl("http://storage.googleapis.com/a.mp3"), false);
  assert.equal(isLibrarySampleUrl("https://example.com/a.mp3"), false);
  assert.equal(isLibrarySampleUrl("/api/audio/a.mp3"), false);
});

test("the picker explains why a preview is unavailable instead of playing something else", () => {
  const copy = { previewUnavailable: "unavailable", previewLimit: "limit", previewFailed: "failed", previewTapAgain: "tap" };
  assert.equal(previewFailureMessage("live_preview_off", copy), "unavailable");
  assert.equal(previewFailureMessage("no_provider_voice", copy), "unavailable");
  assert.equal(previewFailureMessage("daily_cap_reached", copy), "limit");
  assert.equal(previewFailureMessage("provider_failed", copy), "failed");
  assert.equal(previewFailureMessage(undefined, copy), "failed");
});
