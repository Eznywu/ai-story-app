import { encodeRgbaPng } from "@/lib/posters/pngEncode";

export type SceneKind = "human" | "rabbit" | "dragon" | "space";

type RGBA = [number, number, number, number];

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  const clamped = Math.min(1, Math.max(0, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * clamped),
    Math.round(a[1] + (b[1] - a[1]) * clamped),
    Math.round(a[2] + (b[2] - a[2]) * clamped),
    255,
  ];
}

function hit(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function sky(y: number, size: number, top: RGBA, bottom: RGBA): RGBA {
  return mix(top, bottom, y / size);
}

function face(x: number, y: number, cx: number, cy: number, scale: number, skin: RGBA, hair: RGBA): RGBA | null {
  const eye = 4.2 * scale;
  if (hit(x, y, cx - 11 * scale, cy - 2 * scale, eye, eye * 1.15)) return [47, 32, 28, 255];
  if (hit(x, y, cx + 11 * scale, cy - 2 * scale, eye, eye * 1.15)) return [47, 32, 28, 255];
  if (hit(x, y, cx, cy + 16 * scale, 10 * scale, 5 * scale) && y > cy + 12 * scale) return [166, 92, 78, 255];
  if (hit(x, y, cx, cy - 8 * scale, 34 * scale, 28 * scale) && y < cy + 2 * scale) return hair;
  if (hit(x, y, cx, cy, 32 * scale, 34 * scale)) return skin;
  return null;
}

function human(x: number, y: number, s: number): RGBA {
  let color = sky(y, s, [186, 206, 228, 255], [246, 241, 233, 255]);
  if (hit(x, y, s * 0.78, s * 0.16, s * 0.07, s * 0.07)) color = [244, 220, 150, 255];
  if (y > s * 0.74) color = [158, 188, 156, 255];
  if (x > s * 0.14 && x < s * 0.19 && y > s * 0.52 && y < s * 0.78) color = [122, 84, 58, 255];
  if (hit(x, y, s * 0.165, s * 0.48, s * 0.11, s * 0.1)) color = [78, 128, 86, 255];
  if (x > s * 0.43 && x < s * 0.57 && y > s * 0.5 && y < s * 0.76) color = [246, 236, 214, 255];
  if (hit(x, y, s * 0.66, s * 0.58, s * 0.035, s * 0.045)) color = [193, 124, 99, 255];
  const head = face(x, y, s * 0.5, s * 0.42, s / 320, [214, 166, 132, 255], [48, 36, 32, 255]);
  return head ?? color;
}

function rabbit(x: number, y: number, s: number): RGBA {
  let color = sky(y, s, [214, 228, 206, 255], [246, 241, 233, 255]);
  if (y > s * 0.72) color = [168, 196, 140, 255];
  if (hit(x, y, s * 0.22, s * 0.62, s * 0.08, s * 0.05)) color = [232, 168, 176, 255];
  if (hit(x, y, s * 0.5, s * 0.62, s * 0.16, s * 0.12)) color = [186, 186, 190, 255];
  if (hit(x, y, s * 0.5, s * 0.66, s * 0.08, s * 0.07)) color = [246, 246, 244, 255];
  if (hit(x, y, s * 0.42, s * 0.3, s * 0.035, s * 0.12)) color = [176, 176, 182, 255];
  if (hit(x, y, s * 0.58, s * 0.3, s * 0.035, s * 0.12)) color = [176, 176, 182, 255];
  if (hit(x, y, s * 0.42, s * 0.24, s * 0.02, s * 0.05)) color = [236, 196, 196, 255];
  if (hit(x, y, s * 0.58, s * 0.24, s * 0.02, s * 0.05)) color = [236, 196, 196, 255];
  if (y > s * 0.55 && y < s * 0.6 && x > s * 0.4 && x < s * 0.6) color = [90, 122, 168, 255];
  if (hit(x, y, s * 0.62, s * 0.58, s * 0.018, s * 0.018)) color = [196, 164, 72, 255];
  const head = face(x, y, s * 0.5, s * 0.46, s / 340, [210, 210, 214, 255], [186, 186, 192, 255]);
  return head ?? color;
}

function dragon(x: number, y: number, s: number): RGBA {
  let color = sky(y, s, [186, 176, 214, 255], [232, 220, 206, 255]);
  if (hit(x, y, s * 0.8, s * 0.18, s * 0.06, s * 0.06)) color = [244, 236, 214, 255];
  if (y > s * 0.76) color = [120, 108, 96, 255];
  if (hit(x, y, s * 0.34, s * 0.48, s * 0.1, s * 0.06)) color = [130, 168, 140, 255];
  if (hit(x, y, s * 0.66, s * 0.48, s * 0.1, s * 0.06)) color = [130, 168, 140, 255];
  if (hit(x, y, s * 0.5, s * 0.6, s * 0.16, s * 0.1)) color = [142, 176, 146, 255];
  if (hit(x, y, s * 0.5, s * 0.64, s * 0.07, s * 0.05)) color = [236, 228, 210, 255];
  if (x > s * 0.7 && x < s * 0.74 && y > s * 0.7 && y < s * 0.78) color = [196, 164, 72, 255];
  if (hit(x, y, s * 0.72, s * 0.69, s * 0.025, s * 0.018)) color = [196, 164, 72, 255];
  const head = face(x, y, s * 0.5, s * 0.44, s / 300, [154, 186, 150, 255], [96, 140, 110, 255]);
  return head ?? color;
}

function space(x: number, y: number, s: number): RGBA {
  let color = sky(y, s, [28, 36, 64, 255], [70, 78, 112, 255]);
  const stars: Array<[number, number]> = [
    [0.12, 0.14],
    [0.28, 0.22],
    [0.7, 0.12],
    [0.84, 0.28],
    [0.18, 0.36],
    [0.62, 0.2],
  ];
  for (const [sx, sy] of stars) {
    if (hit(x, y, sx * s, sy * s, 2.2, 2.2)) color = [246, 241, 233, 255];
  }
  if (hit(x, y, s * 0.78, s * 0.18, s * 0.07, s * 0.07)) color = [232, 220, 176, 255];
  if (y > s * 0.78) color = [36, 44, 68, 255];
  if (x > s * 0.42 && x < s * 0.58 && y > s * 0.52 && y < s * 0.78) color = [36, 52, 92, 255];
  if (hit(x, y, s * 0.46, s * 0.6, s * 0.015, s * 0.015)) color = [214, 190, 120, 255];
  const head = face(x, y, s * 0.5, s * 0.44, s / 320, [214, 166, 132, 255], [24, 20, 28, 255]);
  return head ?? color;
}

const PAINTERS: Record<SceneKind, (x: number, y: number, size: number) => RGBA> = {
  human,
  rabbit,
  dragon,
  space,
};

const MOCK_GLYPHS: Record<string, string[]> = {
  M: ["10001", "11011", "10101", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  C: ["01110", "10001", "10000", "10001", "01110"],
  K: ["10001", "10010", "11100", "10010", "10001"],
};

function mockStamp(x: number, y: number): RGBA | null {
  const scale = 3;
  const originX = 12;
  const originY = 12;
  const word = "MOCK";
  const localX = x - originX;
  const localY = y - originY;
  if (localX < 0 || localY < 0) return null;
  const glyphWidth = 5 * scale + scale;
  const index = Math.floor(localX / glyphWidth);
  if (index < 0 || index >= word.length) return null;
  const glyph = MOCK_GLYPHS[word[index] ?? ""];
  if (!glyph) return null;
  const col = Math.floor((localX % glyphWidth) / scale);
  const row = Math.floor(localY / scale);
  if (row < 0 || row >= glyph.length || col < 0 || col >= 5) return null;
  return glyph[row]?.[col] === "1" ? [71, 49, 42, 255] : null;
}

export function renderScene(kind: SceneKind, size = 640): Buffer {
  const paint = PAINTERS[kind];
  return encodeRgbaPng(size, size, (x, y) => mockStamp(x, y) ?? paint(x, y, size));
}

export function sceneKindFromPrompt(prompt: string): SceneKind {
  const text = prompt.toLowerCase();
  if (text.includes("dragon")) return "dragon";
  if (text.includes("rabbit")) return "rabbit";
  if (/\bspace\b|starry|stars/.test(text)) return "space";
  return "human";
}
