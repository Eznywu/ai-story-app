"use client";

import React from "react";

export type HomeTabId = "home" | "create" | "library" | "profile";

type Props = {
  active: HomeTabId;
  onChange: (tab: HomeTabId) => void;
};

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCreate({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5l1.5 3h3.3l-2.7 2 1 3.2L12 11.9 9.9 13.2l1-3.2-2.7-2h3.3L12 5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 17.5h10M8.5 20h7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

function IconLibrary({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 4.5h4a1 1 0 011 1v13a1 1 0 01-1 1H6a1 1 0 01-1-1v-13a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M11 6.5h7a1 1 0 011 1v11a1 1 0 01-1 1h-7"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M8 8.5h.01M8 12h.01M8 15.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconProfile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS: { id: HomeTabId; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "create", label: "Create", Icon: IconCreate },
  { id: "library", label: "Library", Icon: IconLibrary },
  { id: "profile", label: "Profile", Icon: IconProfile },
];

export function HomeTabBar({ active, onChange }: Props) {
  return (
    <nav className="homeTabBar" aria-label="Main navigation">
      <div className="homeTabBar__inner homeTabBar__inner--four">
        {TABS.map((tab) => {
          const Icon = tab.Icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`homeTabBar__btn${isActive ? " homeTabBar__btn--active" : ""}`}
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="homeTabBar__iconWrap">
                <Icon className="homeTabBar__icon" />
              </span>
              <span className="homeTabBar__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
