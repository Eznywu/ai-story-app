import assert from "node:assert/strict";
import test from "node:test";
import { focusWrapIndex } from "../app/components/focusWrap.ts";

test("Tab wraps from the last control to the first, and Shift+Tab wraps the other way", () => {
  assert.equal(focusWrapIndex(4, 3, false), 0);
  assert.equal(focusWrapIndex(4, 0, true), 3);
  assert.equal(focusWrapIndex(4, 1, false), null);
  assert.equal(focusWrapIndex(4, 2, true), null);
});

test("Shift+Tab from the dialog container wraps to the last control", () => {
  assert.equal(focusWrapIndex(3, -1, true), 2);
  assert.equal(focusWrapIndex(3, -1, false), null);
});

test("an empty sheet does not invent a focus target", () => {
  assert.equal(focusWrapIndex(0, -1, false), null);
  assert.equal(focusWrapIndex(1, 0, false), 0);
  assert.equal(focusWrapIndex(1, 0, true), 0);
});
