import assert from "node:assert/strict";
import test from "node:test";
import { skipWithin } from "../lib/audio/skipWithin.ts";

test("skip 15 seconds stays inside a longer clip", () => {
  assert.equal(skipWithin(0, 15, 45), 15);
  assert.equal(skipWithin(15, 15, 45), 30);
  assert.equal(skipWithin(40, 15, 45), 45);
  assert.equal(skipWithin(10, -15, 45), 0);
  assert.equal(skipWithin(20, -15, 45), 5);
});

test("skip does not invent time when the duration is missing", () => {
  assert.equal(skipWithin(0, 15, 0), 0);
  assert.equal(skipWithin(0, 15, Number.NaN), 0);
  assert.equal(skipWithin(Number.NaN, 15, 45), 15);
  assert.equal(skipWithin(3, Number.NaN, 45), 3);
});
