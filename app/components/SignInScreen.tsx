"use client";

import { useEffect, useState } from "react";
import "@/app/page.css";

type Props = {
  onSignedIn: () => void;
};

export function SignInScreen({ onSignedIn }: Props) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  async function sendCode() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        cooldownSeconds?: number;
        retryAfterSeconds?: number;
      };
      if (!res.ok) {
        setError(data.error || "We couldn't send a code.");
        if (typeof data.retryAfterSeconds === "number") setCooldown(data.retryAfterSeconds);
        return;
      }
      setStep("code");
      setCooldown(typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : 30);
    } catch {
      setError("We couldn't send a code. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode() {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "That code is incorrect or expired.");
        return;
      }
      onSignedIn();
    } catch {
      setError("We couldn't check that code. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  const busy = sending || verifying;

  return (
    <main className="pageRoot">
      <div className="overlay">
        <div className="container">
          <header>
            <p className="signInBrand">Emrsy Story</p>
            <h1 className="title">Sign in</h1>
            <p className="subtitle">
              Enter your email and we&apos;ll send a 6-digit code. No password, and the code stays in this app.
            </p>
          </header>

          {step === "email" ? (
            <form
              className="panel signInPanel"
              onSubmit={(event) => {
                event.preventDefault();
                if (!busy) void sendCode();
              }}
            >
              <label className="field" htmlFor="sign-in-email">
                <span className="label">Email</span>
                <input
                  id="sign-in-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={busy}
                />
              </label>
              {error ? (
                <div className="errorBox" role="alert">
                  <span className="errorText">{error}</span>
                </div>
              ) : null}
              <div className="signInActions">
                <button className="button buttonPrimary" type="submit" disabled={busy || !email.trim()}>
                  {sending ? "Sending code…" : "Email me a code"}
                </button>
              </div>
            </form>
          ) : (
            <form
              className="panel signInPanel"
              onSubmit={(event) => {
                event.preventDefault();
                if (!busy) void verifyCode();
              }}
            >
              <p className="signInEmail">Code sent to {email.trim()}</p>
              <label className="field" htmlFor="sign-in-code">
                <span className="label">6-digit code</span>
                <input
                  id="sign-in-code"
                  name="code"
                  className="signInCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  disabled={busy}
                  aria-invalid={Boolean(error)}
                />
              </label>
              {error ? (
                <div className="errorBox" role="alert">
                  <span className="errorText">{error}</span>
                </div>
              ) : null}
              <div className="signInActions">
                <button className="button buttonPrimary" type="submit" disabled={busy || code.length !== 6}>
                  {verifying ? "Checking code…" : "Sign in"}
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={busy || cooldown > 0}
                  onClick={() => void sendCode()}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : sending ? "Sending code…" : "Resend code"}
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}

          <footer className="legalFooter">
            <a href="/legal/privacy">Privacy</a>
            <span aria-hidden="true"> · </span>
            <a href="/legal/terms">Terms</a>
          </footer>
        </div>
      </div>
    </main>
  );
}
