import { isCloneVoiceId, makeCloneVoiceId } from "@/lib/voices";

/** Legacy single-clone key (migrated once into list storage) */
const LEGACY_STORAGE_KEY = "bedtime_story_cloned_voice_v1";
const LIST_STORAGE_KEY = "bedtime_story_cloned_voices_v2";

type VoiceRow = { id: string; name?: string; language?: string; isDefault?: boolean };

export type StoredClonedVoice = {
  elevenVoiceId: string;
  label: string;
  language: string;
};

function normalizeEntry(raw: unknown): StoredClonedVoice | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<StoredClonedVoice>;
  if (typeof o.elevenVoiceId !== "string" || !o.elevenVoiceId.trim()) return null;
  return {
    elevenVoiceId: o.elevenVoiceId.trim(),
    label:
      typeof o.label === "string" && o.label.trim()
        ? o.label.trim()
        : "My voice",
    language: typeof o.language === "string" ? o.language : "en",
  };
}

function writeStoredClonedVoicesList(list: StoredClonedVoice[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(list));
}

export function readStoredClonedVoices(): StoredClonedVoice[] {
  if (typeof window === "undefined") return [];
  try {
    const listRaw = localStorage.getItem(LIST_STORAGE_KEY);
    if (listRaw) {
      const parsed = JSON.parse(listRaw) as unknown;
      if (Array.isArray(parsed)) {
        const out = parsed.map(normalizeEntry).filter((x): x is StoredClonedVoice => x != null);
        return out;
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const one = normalizeEntry(JSON.parse(legacyRaw) as unknown);
      if (one) {
        writeStoredClonedVoicesList([one]);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return [one];
      }
    }
  } catch {
    return [];
  }
  return [];
}

export function appendStoredClonedVoice(entry: StoredClonedVoice) {
  const list = readStoredClonedVoices().filter((v) => v.elevenVoiceId !== entry.elevenVoiceId);
  list.unshift(entry);
  writeStoredClonedVoicesList(list);
}

export function clearStoredClonedVoices() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LIST_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function mergeClonedVoiceIntoList(list: VoiceRow[], stored: StoredClonedVoice[]): VoiceRow[] {
  const base = list.filter((v) => !isCloneVoiceId(v.id));
  const cloneRows: VoiceRow[] = stored.map((s) => ({
    id: makeCloneVoiceId(s.elevenVoiceId),
    name: s.label,
    language: s.language,
  }));
  return [...cloneRows, ...base];
}
