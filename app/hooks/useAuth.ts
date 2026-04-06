"use client";

import { useCallback, useEffect, useState } from "react";

export type AuthState = {
  loggedIn: boolean;
  member: boolean;
  email: string | null;
  defaultStory: { title: string; text: string };
};

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthState | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setAuth({
      loggedIn: Boolean(data.loggedIn),
      member: Boolean(data.member),
      email: typeof data.email === "string" ? data.email : null,
      defaultStory: {
        title: String(data.defaultStory?.title ?? ""),
        text: String(data.defaultStory?.text ?? ""),
      },
    });
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `Login failed (${res.status})`);
      }
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await refresh();
  }, [refresh]);

  const joinMembership = useCallback(
    async (code: string) => {
      const res = await fetch("/api/auth/join-membership", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Could not join (${res.status})`
        );
      }
      await refresh();
    },
    [refresh]
  );

  return { loading, auth, refresh, login, logout, joinMembership };
}
