"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      >
        Settings
      </Link>
      <Link href="/play" className={`appChromeBar__link${playActive ? " appChromeBar__link--active" : ""}`}>
        Play
      </Link>
    </div>
  );
}
