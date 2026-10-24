"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
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
