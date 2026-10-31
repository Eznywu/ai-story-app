export type ReviewStatus = "pending" | "approved" | "rejected";
export type PronunciationMethod = "none" | "narration-alias" | "model-default" | "phoneme-ipa";

export type PronunciationEntry = {
  id: string;
  term: string;
  language: "en" | "zh-Hant" | "all";
  intendedPronunciation: string;
  alias: string;
  example: string;
  reviewStatus: ReviewStatus;
  method: PronunciationMethod;
  apply: boolean;
  notes: string;
};

export type PronunciationDictionary = {
  version: string;
  notes?: string;
  entries: PronunciationEntry[];
};

const STATUSES = new Set<ReviewStatus>(["pending", "approved", "rejected"]);
const METHODS = new Set<PronunciationMethod>(["none", "narration-alias", "model-default", "phoneme-ipa"]);

export function parsePronunciationDictionary(data: unknown): PronunciationDictionary {
  if (!data || typeof data !== "object") throw new Error("Pronunciation dictionary is not an object.");
  const record = data as { version?: unknown; notes?: unknown; entries?: unknown };
  if (typeof record.version !== "string" || !record.version.trim()) {
    throw new Error("Pronunciation dictionary needs a version.");
  }
  if (!Array.isArray(record.entries)) throw new Error("Pronunciation dictionary needs entries.");
  const entries = record.entries.map((entry, index) => parseEntry(entry, index));
  return {
    version: record.version.trim(),
    notes: typeof record.notes === "string" ? record.notes : undefined,
    entries,
  };
}

function parseEntry(value: unknown, index: number): PronunciationEntry {
  if (!value || typeof value !== "object") throw new Error(`Dictionary entry ${index} is not an object.`);
  const row = value as Partial<PronunciationEntry>;
  if (typeof row.id !== "string" || !row.id.trim()) throw new Error(`Dictionary entry ${index} needs an id.`);
  if (typeof row.term !== "string" || !row.term.trim()) throw new Error(`Dictionary entry ${row.id} needs a term.`);
  if (row.language !== "en" && row.language !== "zh-Hant" && row.language !== "all") {
    throw new Error(`Dictionary entry ${row.id} has an unsupported language.`);
  }
  if (!STATUSES.has(row.reviewStatus as ReviewStatus)) {
    throw new Error(`Dictionary entry ${row.id} has a bad review status.`);
  }
  if (!METHODS.has(row.method as PronunciationMethod)) {
    throw new Error(`Dictionary entry ${row.id} has a bad method.`);
  }
  const reviewStatus = row.reviewStatus as ReviewStatus;
  const method = row.method as PronunciationMethod;
  const apply = row.apply === true;
  if (apply && (reviewStatus !== "approved" || method !== "narration-alias" || !String(row.alias ?? "").trim())) {
    throw new Error(`Dictionary entry ${row.id} cannot be applied. Only an approved narration alias with text may be applied.`);
  }
  if (reviewStatus === "pending" && apply) {
    throw new Error(`Dictionary entry ${row.id} is pending and must not be applied.`);
  }
  return {
    id: row.id.trim(),
    term: row.term,
    language: row.language,
    intendedPronunciation: String(row.intendedPronunciation ?? ""),
    alias: String(row.alias ?? ""),
    example: String(row.example ?? ""),
    reviewStatus,
    method,
    apply,
    notes: String(row.notes ?? ""),
  };
}

export function languageMatches(entryLanguage: PronunciationEntry["language"], language: string): boolean {
  if (entryLanguage === "all") return true;
  const value = language.toLowerCase();
  if (entryLanguage === "zh-Hant") return value.startsWith("zh");
  return value.startsWith("en");
}

export function applicableAliases(dictionary: PronunciationDictionary, language: string): PronunciationEntry[] {
  return dictionary.entries
    .filter(
      (entry) =>
        entry.apply &&
        entry.reviewStatus === "approved" &&
        entry.method === "narration-alias" &&
        entry.alias.trim() &&
        languageMatches(entry.language, language)
    )
    .sort((a, b) => b.term.length - a.term.length);
}
