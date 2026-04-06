"use client";

import React, { useState } from "react";

type Props = {
  loading: boolean;
  loggedIn: boolean;
  member: boolean;
  email: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onJoinMembership: (code: string) => Promise<void>;
};

export function MembershipCard({
  loading,
  loggedIn,
  member,
  email,
  onLogin,
  onLogout,
  onJoinMembership,
}: Props) {
  const [emailIn, setEmailIn] = useState("");
  const [passwordIn, setPasswordIn] = useState("");
  const [codeIn, setCodeIn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onLogin(emailIn.trim(), passwordIn);
      setPasswordIn("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onJoinMembership(codeIn.trim());
      setCodeIn("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not activate membership.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setError("");
    setBusy(true);
    try {
      await onLogout();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Logout failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profilePanel__card membershipCard">
      <h2 className="profilePanel__h2">Account &amp; membership</h2>
      {loading ? (
        <p className="profilePanel__muted">Loading…</p>
      ) : member ? (
        <>
          <p className="membershipCard__status">
            You&apos;re signed in with <strong>{email ?? "membership"}</strong> and can generate custom stories.
          </p>
          <button type="button" className="button profilePanel__btn" onClick={() => void handleLogout()} disabled={busy}>
            {busy ? "…" : "Log out"}
          </button>
        </>
      ) : loggedIn ? (
        <>
          <p className="membershipCard__status">
            Signed in as <strong>{email}</strong>. Enter your membership code to unlock story generation.
          </p>
          <form className="membershipCard__form" onSubmit={(e) => void handleJoin(e)}>
            <label className="field membershipCard__field">
              <span className="label">Membership code</span>
              <input
                value={codeIn}
                onChange={(e) => setCodeIn(e.target.value)}
                autoComplete="off"
                placeholder="Code from your invite"
              />
            </label>
            {error ? (
              <p className="membershipCard__error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="membershipCard__actions">
              <button type="submit" className="button buttonPrimary" disabled={busy || !codeIn.trim()}>
                {busy ? "…" : "Join membership"}
              </button>
              <button type="button" className="button" onClick={() => void handleLogout()} disabled={busy}>
                Log out
              </button>
            </div>
          </form>
        </>
      ) : (
        <form className="membershipCard__form" onSubmit={(e) => void handleLogin(e)}>
          <p className="profilePanel__muted">
            Without an account you can listen to the sample story only. Log in and join membership to create your own.
          </p>
          <label className="field membershipCard__field">
            <span className="label">Email</span>
            <input
              type="email"
              value={emailIn}
              onChange={(e) => setEmailIn(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field membershipCard__field">
            <span className="label">Password</span>
            <input
              type="password"
              value={passwordIn}
              onChange={(e) => setPasswordIn(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="membershipCard__error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="button buttonPrimary profilePanel__btn" disabled={busy}>
            {busy ? "…" : "Log in"}
          </button>
        </form>
      )}
    </div>
  );
}
