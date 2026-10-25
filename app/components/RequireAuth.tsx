"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import "@/app/page.css";
import { SignInScreen } from "@/app/components/SignInScreen";

export type AuthUser = { id: string; email: string };

type AuthContextValue = {
  user: AuthUser;
  /** False while email sign-in is paused (`AUTH_ENABLED` off). */
  authEnabled: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthUser(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("Sign-in is still loading.");
  }
  return value;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "in" | "out" | "error">("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        user?: AuthUser | null;
        authEnabled?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setUser(null);
        setError(data.error || "We couldn't check your sign-in.");
        setStatus("error");
        return;
      }
      setAuthEnabled(data.authEnabled !== false);
      if (data.user?.id && data.user.email) {
        setUser({ id: data.user.id, email: data.user.email });
        setError("");
        setStatus("in");
        return;
      }
      setUser(null);
      setStatus("out");
    } catch {
      setUser(null);
      setError("We couldn't check your sign-in.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.assign("/");
  }, []);

  if (status === "loading") {
    return (
      <main className="pageRoot" aria-busy="true">
        <div className="overlay">
          <div className="container">
            <p className="subtitle">Checking your sign-in…</p>
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
            <h1 className="title">Sign in</h1>
            <div className="errorBox" role="alert">
              <span className="errorText">{error}</span>
            </div>
            <button type="button" className="button buttonPrimary" onClick={() => void refresh()}>
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (status === "out" || !user) {
    return <SignInScreen onSignedIn={() => void refresh()} />;
  }

  return <AuthContext.Provider value={{ user, authEnabled, signOut }}>{children}</AuthContext.Provider>;
}
