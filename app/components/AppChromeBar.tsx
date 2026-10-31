"use client";

import { BrandMark } from "@/app/components/BrandMark";
import { BRAND_NAME } from "@/lib/brand";

/** Modest brand mark inside the app. Settings live under Profile. */
export function AppChromeBar() {
  return (
    <div className="appChromeBar appChromeBar--brand">
      <BrandMark variant="onDark" className="appChromeBar__mark" label={null} />
      <span className="appChromeBar__brand">{BRAND_NAME}</span>
    </div>
  );
}
