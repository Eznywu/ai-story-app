import Link from "next/link";
import "@/app/page.css";
import { AppChromeBar } from "@/app/components/AppChromeBar";

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
            <p style={{ margin: "8px 0 0", fontWeight: 700 }}>
              <Link href="/legal/privacy">Privacy policy</Link>
            </p>
            <p style={{ margin: "8px 0 0", fontWeight: 700 }}>
              <Link href="/legal/terms">Terms of use</Link>
            </p>
          </div>
          <p style={{ marginTop: 16 }}>
            <Link href="/" className="button">
              ← Back to app
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
