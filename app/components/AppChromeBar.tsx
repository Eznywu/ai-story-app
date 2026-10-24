"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.603 4.317a1.125 1.125 0 012.794 0l.188.707a1.125 1.125 0 001.657.693l.618-.354a1.125 1.125 0 011.97 1.138l-.188.706a1.125 1.125 0 00.518 1.271l.575.332a1.125 1.125 0 010 1.948l-.575.332a1.125 1.125 0 00-.518 1.271l.188.706a1.125 1.125 0 01-1.97 1.138l-.618-.354a1.125 1.125 0 00-1.657.693l-.188.707a1.125 1.125 0 01-2.794 0l-.188-.707a1.125 1.125 0 00-1.657-.693l-.618.354a1.125 1.125 0 01-1.97-1.138l.188-.706a1.125 1.125 0 00-.518-1.271l-.575-.332a1.125 1.125 0 010-1.948l.575-.332a1.125 1.125 0 00.518-1.271l-.188-.706a1.125 1.125 0 011.97-1.138l.618.354a1.125 1.125 0 001.657-.693l.188-.707z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5l1.7 3.8 3.8 1.7-3.8 1.7-1.7 3.8-1.7-3.8-3.8-1.7 3.8-1.7L12 4.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M18.5 3v2M17.5 4h2M6 15.5v2M5 16.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Top-left chrome on main app and standalone pages: Settings + Play.
 */
export function AppChromeBar() {
  const pathname = usePathname();
  const settingsActive = pathname === "/settings";
  const playActive = pathname === "/play";

  return (
    <div className="appChromeBar">
      <Link
        href="/settings"
        className={`appChromeBar__link${settingsActive ? " appChromeBar__link--active" : ""}`}
        aria-label="Settings"
        title="Settings"
      >
        <IconSettings className="appChromeBar__icon" />
      </Link>
      <div className="appChromeBar__brand" aria-hidden>
        Emrsy Story
      </div>
      <Link
        href="/play"
        className={`appChromeBar__wallet${playActive ? " appChromeBar__wallet--active" : ""}`}
        aria-label="Play"
        title="Play"
      >
        <span className="appChromeBar__walletSparkWrap">
          <IconSpark className="appChromeBar__walletSpark" />
        </span>
        <span className="appChromeBar__walletValue">13</span>
        <span className="visuallyHidden">Open play and credits</span>
      </Link>
    </div>
  );
}
