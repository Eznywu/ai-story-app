import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePronunciationDictionary, type PronunciationDictionary } from "./pronunciationDictionary";

let cached: PronunciationDictionary | null = null;

export function getPronunciationDictionary(): PronunciationDictionary {
  if (!cached) {
    const file = path.join(process.cwd(), "data/pronunciation/dictionary.json");
    cached = parsePronunciationDictionary(JSON.parse(readFileSync(file, "utf8")));
  }
  return cached;
}

export function pronunciationDictionaryVersion(): string {
  return getPronunciationDictionary().version;
}
