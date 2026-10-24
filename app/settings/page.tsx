import Link from "next/link";
import "@/app/page.css";
import { AppChromeBar } from "@/app/components/AppChromeBar";
import { BackButton } from "@/app/components/BackButton";

export default function SettingsPage() {
  return (
    <main className="pageRoot">
      <div className="overlay">
        <div className="container">
          <AppChromeBar />
          <header className="standalonePageHeader">
            <h1 className="title">Settings</h1>
            <p className="subtitle">App preferences and legal.</p>
          </header>
          <div className="panel" style={{ marginTop: 14 }}>
            <p className="label" style={{ marginTop: 0 }}>
              Legal
            </p>
            <p className="settingsLegalLink">
              <Link href="/legal/privacy">Privacy policy</Link>
            </p>
            <p className="settingsLegalLink">
              <Link href="/legal/terms">Terms of use</Link>
            </p>
          </div>
          <div style={{ marginTop: 16 }}>
            <BackButton className="button">← Back</BackButton>
          </div>
        </div>
      </div>
    </main>
  );
}
