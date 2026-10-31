/** Artwork age bands are design presets, not developmental claims. */

export const AGE_BANDS = ["0-2", "3-5", "6-8", "9+"] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export type AudienceAge = {
  /** The listener age the parent chose, kept as entered. */
  label: string;
  /** Normalised age in months when the label can be read. */
  months: number | null;
  band: AgeBand;
};

function toMonths(label: string): number | null {
  const lower = label.toLowerCase();
  const match = lower.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (lower.includes("month") || lower.includes("個月") || lower.includes("个月")) return amount;
  if (
    lower.includes("year") ||
    lower.includes("歲") ||
    lower.includes("岁") ||
    lower.includes("yr")
  ) {
    return amount * 12;
  }
  // A bare number in this app is an age in years ("4", "10").
  return amount * 12;
}

export function ageBandForMonths(months: number | null): AgeBand {
  if (months == null) return "3-5";
  if (months < 36) return "0-2";
  if (months < 72) return "3-5";
  if (months < 108) return "6-8";
  return "9+";
}

/** Audience age of the listener. This is not the protagonist's age. */
export function parseAudienceAge(raw: string | null | undefined): AudienceAge {
  const label = (raw ?? "").trim() || "unspecified";
  const months = label === "unspecified" ? null : toMonths(label);
  return { label, months, band: ageBandForMonths(months) };
}
