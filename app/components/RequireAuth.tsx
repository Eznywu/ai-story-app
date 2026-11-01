"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import "@/app/page.css";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { SignInScreen } from "@/app/components/SignInScreen";

export type AuthUser = { id: string; email: string };

type AuthContextValue = {
  user: AuthUser;
  /** False while email sign-in is paused (`AUTH_ENABLED` off). */
  authEnabled: boolean;
  /** True only for the local dev parent. Never a real signed-in account. */
  localTestParent: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthUser(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("Sign-in is still loading.");
  }
  return value;
}

type SessionPayload = {
  user?: AuthUser | null;
  authEnabled?: boolean;
  localTestParent?: boolean;
  error?: string;
};

async function readSession(): Promise<{ ok: boolean; data: SessionPayload }> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as SessionPayload;
  return { ok: res.ok, data };
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { messages } = useInterfaceLocale();
  const [status, setStatus] = useState<"loading" | "in" | "out" | "error">("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [localTestParent, setLocalTestParent] = useState(false);
  const [error, setError] = useState("");

  const commitSession = useCallback((ok: boolean, data: SessionPayload) => {
    if (!ok) {
      setUser(null);
      setError(data.error || "");
      setStatus("error");
      return;
    }
    setAuthEnabled(data.authEnabled !== false);
    setLocalTestParent(data.localTestParent === true);
    if (data.user?.id && data.user.email) {
      setUser({ id: data.user.id, email: data.user.email });
      setError("");
      setStatus("in");
      return;
    }
    setUser(null);
    setStatus("out");
  }, []);

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const { ok, data } = await readSession();
      commitSession(ok, data);
    } catch {
      setUser(null);
      setError("");
      setStatus("error");
    }
  }, [commitSession]);

  useEffect(() => {
    let cancelled = false;
    // The first paint is already "loading". Wait for the session response before setting state
    // so this effect does not cascade a render on mount.
    readSession()
      .then(({ ok, data }) => {
        if (!cancelled) commitSession(ok, data);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setError("");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [commitSession]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.assign("/");
  }, []);

  if (status === "loading") {
    return (
      <main className="pageRoot" aria-busy="true">
        <div className="overlay">
          <div className="container">
            <p className="subtitle">{messages.auth.checkingSession}</p>
          </div>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="pageRoot">
        <div className="overlay">
          <div className="container">
            <h1 className="title">{messages.auth.title}</h1>
            <div className="errorBox" role="alert">
              <span className="errorText">{error || messages.auth.sessionError}</span>
            </div>
            <button type="button" className="button buttonPrimary" onClick={() => void refresh()}>
              {messages.common.tryAgain}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (status === "out" || !user) {
    return <SignInScreen onSignedIn={() => void refresh()} />;
  }

  return <AuthContext.Provider value={{ user, authEnabled, localTestParent, signOut }}>{children}</AuthContext.Provider>;
}
