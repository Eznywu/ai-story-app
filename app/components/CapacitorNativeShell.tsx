"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const STATUS_BAR_HEX = "#5e4a9c";

/**
 * iOS/Android Capacitor: status bar matches app chrome; overlay + safe-area CSS on web content.
 * No-op in plain browser / SSR.
 */
export function CapacitorNativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
        try {
          await StatusBar.setBackgroundColor({ color: STATUS_BAR_HEX });
        } catch {
          /* background may be ignored when overlay is true on some versions */
        }
        if (active) await StatusBar.show();
      } catch {
        /* optional native enhancement */
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
