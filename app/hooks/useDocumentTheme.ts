"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export type DocumentTheme = "warm" | "night";

const BAR_COLOR: Record<DocumentTheme, string> = { warm: "#FBF6EE", night: "#11182B" };

function apply(theme: DocumentTheme) {
  document.documentElement.dataset.hhTheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOR[theme]);
  if (Capacitor.isNativePlatform()) {
    // Style.Light is dark status-bar text for light screens; Style.Dark is light text for the navy screens.
    void StatusBar.setStyle({ style: theme === "warm" ? Style.Light : Style.Dark }).catch(() => {});
  }
}

/**
 * Sheets render outside the page, so they read the palette from <html data-hh-theme>.
 * The browser bar and the iOS status bar follow it too. Leaving the screen returns to night.
 */
export function useDocumentTheme(theme: DocumentTheme) {
  useEffect(() => {
    apply(theme);
    return () => apply("night");
  }, [theme]);
}
