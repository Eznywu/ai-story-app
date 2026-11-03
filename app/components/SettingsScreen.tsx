"use client";

import Link from "next/link";
import { AppChromeBar } from "@/app/components/AppChromeBar";
import { BackButton } from "@/app/components/BackButton";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { SettingsAccount } from "@/app/components/SettingsAccount";

export function SettingsScreen() {
  const { messages } = useInterfaceLocale();
  const copy = messages.settings;
  return (
    <main className="pageRoot">
      <div className="overlay">
        <div className="container">
          <AppChromeBar />
          <header className="standalonePageHeader">
            <h1 className="title">{copy.title}</h1>
            <p className="subtitle">{copy.lede}</p>
          </header>
          <SettingsAccount />
          <div className="panel" style={{ marginTop: 14 }}>
            <p className="label" style={{ marginTop: 0 }}>
              {copy.legal}
            </p>
            <p className="settingsLegalLink">
              <Link href="/legal/privacy">{copy.privacy}</Link>
            </p>
            <p className="settingsLegalLink">
              <Link href="/legal/terms">{copy.terms}</Link>
            </p>
          </div>
          <div style={{ marginTop: 16 }}>
            <BackButton className="button" />
          </div>
        </div>
      </div>
    </main>
  );
}
