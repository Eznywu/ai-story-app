/** Canonical persisted / form values for child gender (see Prisma `Story.childGender`). */
export type ChildGender = "girl" | "boy" | "any" | "nonbinary";

const CANONICAL = new Set<ChildGender>(["girl", "boy", "any", "nonbinary"]);

function normalizedToken(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  return s === "" ? null : s;
}

/**
 * Parse gender from API or client payload. Empty or invalid → null (do not store / ignore field).
 */
export function parseChildGenderFromClient(raw: unknown): ChildGender | null {
  const token = normalizedToken(raw);
  if (token == null) return null;
  return CANONICAL.has(token as ChildGender) ? (token as ChildGender) : null;
}

/**
 * Normalize for story generation and form state: missing or invalid → `"any"`.
 */
export function normalizeChildGenderForStoryInput(raw: unknown): ChildGender {
  return parseChildGenderFromClient(raw) ?? "any";
}

export function formatChildGenderLabel(value: string): string {
  switch (value.toLowerCase()) {
    case "girl":
      return "Girl";
    case "boy":
      return "Boy";
    case "nonbinary":
      return "Non-binary";
    default:
      return value;
  }
}
