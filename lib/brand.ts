/**
 * Customer-facing Happy Horse identity.
 * Cream, brown, and terracotta are the flat colours sampled from the
 * authoritative logo (median interior pixels of public/brand/happy-horse-logo-original.png).
 * Terracotta stays on the symbol. It is not a button or selection colour.
 * Interface meaning lives in the semantic tokens below.
 */
export const BRAND_NAME = "Happy Horse";
export const BRAND_PROMISE = "Little stories. Lasting closeness.";

export const BRAND_IDENTITY = {
  cream: "#F6F1E9",
  brown: "#47312A",
  terracotta: "#C17C63",
} as const;

export const BRAND_UI = {
  background: "#11182B",
  surface: "#1B243B",
  surfaceRaised: "#25314C",
  text: "#F4F1EB",
  textSecondary: "#B6BDCF",
  champagne: "#D6BE91",
  lavender: "#B9AEDC",
  sage: "#A8C4B5",
  coral: "#E6AAA5",
  divider: "#39435C",
  inputBorder: "#8491AD",
} as const;

export const BRAND_FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Hiragino Sans CNS", "Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", sans-serif';
