"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KidProfile } from "@/lib/profiles/profilesTypes";
import { clearLocalKidProfiles, loadKidProfiles } from "@/lib/profiles/localProfilesStorage";
import { clientJson } from "@/lib/auth/clientApi";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `kid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function putKids(kids: KidProfile[]) {
  await clientJson("/api/kids", {
    method: "PUT",
    body: JSON.stringify({ kids }),
  });
}

export function useKidProfiles() {
  const [profiles, setProfiles] = useState<KidProfile[]>([]);
  const profilesRef = useRef<KidProfile[]>([]);
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());

  const replace = useCallback((next: KidProfile[]) => {
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  useEffect(() => {
    const seen = revision.current;
    let cancelled = false;
    queue.current = queue.current
      .then(async () => {
        const data = await clientJson<{ kids?: KidProfile[] }>("/api/kids");
        if (cancelled || revision.current !== seen) return;
        const server = Array.isArray(data.kids) ? data.kids : [];
        const local = loadKidProfiles();
        let next = server;
        if (server.length === 0 && local.length > 0) {
          await putKids(local);
          clearLocalKidProfiles();
          next = local;
        } else if (local.length > 0) {
          clearLocalKidProfiles();
        }
        if (!cancelled && revision.current === seen) replace(next);
      })
      .catch((error: unknown) => {
        console.error("[kids] load failed", error);
      });
    return () => {
      cancelled = true;
    };
  }, [replace]);

  const persist = useCallback((next: KidProfile[]) => {
    queue.current = queue.current
      .then(() => putKids(next))
      .catch((error: unknown) => {
        console.error("[kids] save failed", error);
      });
  }, []);

  const add = useCallback(
    (input: Omit<KidProfile, "id">) => {
      const created: KidProfile = { ...input, id: newId() };
      revision.current += 1;
      const merged = [...profilesRef.current, created];
      replace(merged);
      persist(merged);
      return created;
    },
    [persist, replace]
  );

  const update = useCallback(
    (id: string, patch: Partial<KidProfile>) => {
      revision.current += 1;
      const merged = profilesRef.current.map((profile) =>
        profile.id === id ? { ...profile, ...patch, id: profile.id } : profile
      );
      replace(merged);
      persist(merged);
    },
    [persist, replace]
  );

  const remove = useCallback(
    (id: string) => {
      revision.current += 1;
      const merged = profilesRef.current.filter((profile) => profile.id !== id);
      replace(merged);
      persist(merged);
    },
    [persist, replace]
  );

  return { profiles, add, update, remove };
}
