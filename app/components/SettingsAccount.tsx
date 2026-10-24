"use client";

import { useState } from "react";
import { useAuthUser } from "@/app/components/RequireAuth";

export function SettingsAccount() {
  const { user, signOut } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <p className="label" style={{ marginTop: 0 }}>
        Account
      </p>
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
    </div>
  );
}
