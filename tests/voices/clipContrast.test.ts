import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SHEET = "#141c3d";
const ICON = "#d6be91";
const FOCUS = "#b9aedc";

function channel(hex: string, index: number): number {
  const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string): number {
  const lum = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
  const lighter = Math.max(lum(foreground), lum(background));
  const darker = Math.min(lum(foreground), lum(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("play and pause icons and the focus ring clear 3:1 on the navy control", () => {
  const css = readFileSync("app/page.css", "utf8");
  const play = css.match(/\.voiceFlow \.clipPlayer__play \{[^}]+\}/)?.[0] ?? "";
  const triangle = css.match(/\.voiceFlow \.clipPlayer__triangle \{[^}]+\}/)?.[0] ?? "";
  const pause = css.match(/\.voiceFlow \.clipPlayer__pause \{[^}]+\}/)?.[0] ?? "";
  const focus = css.match(/\.voiceFlow \.clipPlayer__play:focus-visible \{[^}]+\}/)?.[0] ?? "";
  assert.match(play, new RegExp(`background:\\s*${SHEET}`, "i"));
  assert.match(triangle, new RegExp(ICON, "i"));
  assert.match(pause, new RegExp(ICON, "i"));
  assert.match(focus, new RegExp(FOCUS, "i"));
  assert.ok(contrast(ICON, SHEET) >= 3);
  assert.ok(contrast(FOCUS, SHEET) >= 3);
});
