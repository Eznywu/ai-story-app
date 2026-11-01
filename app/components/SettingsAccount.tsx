"use client";

import { useState } from "react";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { useAuthUser } from "@/app/components/RequireAuth";
import { fill } from "@/lib/i18n/locales";

export function SettingsAccount() {
  const { user, authEnabled, signOut } = useAuthUser();
  const { messages } = useInterfaceLocale();
  const copy = messages.auth;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <p className="label" style={{ marginTop: 0 }}>
        {copy.account}
      </p>
      {authEnabled ? (
        <>
          <p className="signInEmail">{fill(copy.signedIn, { email: user.email })}</p>
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
                  setError(copy.signOutError);
                });
              }}
            >
              {busy ? copy.signingOut : copy.signOut}
            </button>
          </div>
        </>
      ) : (
        <p className="signInEmail">
          {copy.paused}
        </p>
      )}
    </div>
  );
}
