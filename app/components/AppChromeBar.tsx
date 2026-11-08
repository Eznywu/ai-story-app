"use client";

import { BrandMark } from "@/app/components/BrandMark";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { BRAND_NAME } from "@/lib/brand";

/** Modest brand mark inside the app. Language sits at the inline end. Light screens use the light logo. */
export function AppChromeBar({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <div className="appChromeBar appChromeBar--brand">
      <div className="appChromeBar__brandGroup">
        <BrandMark variant={tone === "light" ? "light" : "onDark"} className="appChromeBar__mark" label={null} />
        <span className="appChromeBar__brand">{BRAND_NAME}</span>
      </div>
      <LanguageSwitcher className="appChromeBar__language" />
    </div>
  );
}
