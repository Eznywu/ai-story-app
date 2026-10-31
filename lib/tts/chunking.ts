import { getModelCapability } from "./modelCapabilities";

const SENTENCE_END = new Set(["。", "！", "？", ".", "!", "?"]);
const CLOSING = new Set(['"', "”", "'", "’", "」", "』"]);
const CLAUSE = new Set(["，", "、", "；", ",", ";", "：", ":"]);

export type NarrationChunk = {
  index: number;
  text: string;
};

export function chunkNarrationScript(script: string, maxChars: number): NarrationChunk[] {
  const limit = Math.max(40, Math.floor(maxChars));
  const paragraphs = script
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const pieces = paragraphs.length ? paragraphs : [script.trim()];
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  const pushPiece = (piece: string) => {
    const text = piece.trim();
    if (!text) return;
    if (text.length > limit) {
      throw new Error("A narration sentence is longer than the model limit and has no safe split point.");
    }
    const joiner = current ? " " : "";
    if (current && current.length + joiner.length + text.length > limit) {
      flush();
    }
    current = current ? `${current}${joiner}${text}` : text;
  };

  for (const paragraph of pieces) {
    if (paragraph.length <= limit) {
      if (current && current.length + 2 + paragraph.length > limit) flush();
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    flush();
    for (const sentence of splitSentences(paragraph)) {
      if (sentence.length <= limit) {
        pushPiece(sentence);
        continue;
      }
      for (const clause of splitClauses(sentence)) {
        pushPiece(clause);
      }
    }
  }
  flush();
  return chunks.map((text, index) => ({ index, text }));
}

export function splitSentences(paragraph: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < paragraph.length; i += 1) {
    const ch = paragraph[i];
    buf += ch;
    if (!SENTENCE_END.has(ch)) continue;
    let cursor = i;
    while (cursor + 1 < paragraph.length && CLOSING.has(paragraph[cursor + 1])) {
      cursor += 1;
      buf += paragraph[cursor];
    }
    const next = paragraph[cursor + 1];
    if ((ch === "." || ch === "!" || ch === "?") && next && next !== " " && next !== "\n") {
      i = cursor;
      continue;
    }
    const prev = paragraph[i - 1];
    if (ch === "." && prev && /\d/.test(prev)) {
      i = cursor;
      continue;
    }
    const sentence = buf.trim();
    if (sentence) out.push(sentence);
    buf = "";
    i = cursor;
    while (paragraph[i + 1] === " ") i += 1;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [paragraph.trim()];
}

function splitClauses(sentence: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (const ch of sentence) {
    buf += ch;
    if (!CLAUSE.has(ch)) continue;
    if (buf.trim()) out.push(buf.trim());
    buf = "";
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [sentence.trim()];
}

export type ContinuityContext = {
  previousText?: string;
  nextText?: string;
};

/**
 * Context from the neighboring chunks only. Never the chunk being spoken.
 * Omitted entirely when the model does not support it (eleven_v3).
 */
export function continuityContext(modelId: string, chunks: NarrationChunk[], index: number): ContinuityContext {
  const capability = getModelCapability(modelId);
  if (!capability.previousNextText) return {};
  const previous = index > 0 ? chunks[index - 1]?.text.slice(-300) : undefined;
  const next = index < chunks.length - 1 ? chunks[index + 1]?.text.slice(0, 300) : undefined;
  return {
    ...(previous ? { previousText: previous } : {}),
    ...(next ? { nextText: next } : {}),
  };
}

/** Sections whose joins should be checked after one section is made again. */
export function transitionCheckIndexes(sectionIndex: number, sectionCount: number): number[] {
  const indexes = new Set<number>([sectionIndex]);
  if (sectionIndex > 0) indexes.add(sectionIndex - 1);
  if (sectionIndex + 1 < sectionCount) indexes.add(sectionIndex + 1);
  return [...indexes].sort((a, b) => a - b);
}
