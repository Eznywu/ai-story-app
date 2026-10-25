"use client";

import { useState } from "react";
import { useAuthUser } from "@/app/components/RequireAuth";

export function SettingsAccount() {
  const { user, authEnabled, signOut } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <p className="label" style={{ marginTop: 0 }}>
        Account
      </p>
      {authEnabled ? (
        <>
          <p className="signInEmail">Signed in as {user.email}</p>
          {error ? (
            <div className="errorBox" role="alert">
              <span className="errorText">{error}</span>
            </div>
          ) : null}
          <div className="signInActions">
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError("");
                void signOut().catch(() => {
                  setBusy(false);
                  setError("We couldn't sign out. Try again.");
                });
              }}
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </>
      ) : (
        <p className="signInEmail">
          Login is paused. Stories stay in this app’s library until email sign-in is turned back on.
        </p>
      )}
    </div>
  );
}
