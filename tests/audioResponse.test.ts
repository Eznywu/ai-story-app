import assert from "node:assert/strict";
import { test } from "node:test";
import { audioResponse } from "../lib/audio/audioResponse";

const clip = Buffer.from("0123456789");

test("a full request returns the whole clip and advertises ranges", async () => {
  const res = audioResponse(clip, null);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("accept-ranges"), "bytes");
  assert.equal(Buffer.from(await res.arrayBuffer()).toString(), "0123456789");
});

test("byte ranges let iOS seek, including open and suffix ranges", async () => {
  const middle = audioResponse(clip, "bytes=2-4");
  assert.equal(middle.status, 206);
  assert.equal(middle.headers.get("content-range"), "bytes 2-4/10");
  assert.equal(Buffer.from(await middle.arrayBuffer()).toString(), "234");

  const open = audioResponse(clip, "bytes=7-");
  assert.equal(Buffer.from(await open.arrayBuffer()).toString(), "789");

  const suffix = audioResponse(clip, "bytes=-3");
  assert.equal(suffix.headers.get("content-range"), "bytes 7-9/10");

  const past = audioResponse(clip, "bytes=5-99");
  assert.equal(past.headers.get("content-range"), "bytes 5-9/10");
});

test("an unsatisfiable range is refused", () => {
  assert.equal(audioResponse(clip, "bytes=20-30").status, 416);
  assert.equal(audioResponse(clip, "items=0-1").status, 416);
});
