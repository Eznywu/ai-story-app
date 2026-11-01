"use client";

import { useContext } from "react";
import { BrandMark } from "@/app/components/BrandMark";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { AuthContext } from "@/app/components/RequireAuth";
import { BRAND_NAME } from "@/lib/brand";

/** Modest brand mark inside the app. Language sits at the inline end. */
export function AppChromeBar() {
  const { messages } = useInterfaceLocale();
  const auth = useContext(AuthContext);
  return (
    <div className="appChromeBar appChromeBar--brand">
      <div className="appChromeBar__brandGroup">
        <BrandMark variant="onDark" className="appChromeBar__mark" label={null} />
        <span className="appChromeBar__brand">{BRAND_NAME}</span>
        {auth?.localTestParent ? <span className="localTestParent">{messages.localTest.label}</span> : null}
      </div>
      <LanguageSwitcher className="appChromeBar__language" />
    </div>
  );
}
