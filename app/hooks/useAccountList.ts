"use client";

import { useCallback } from "react";
import { useAccountRecord } from "@/app/hooks/useAccountRecord";

function newId(prefix: string): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** An account-backed list of profiles. Lists saved only in this browser by older builds move to the account once. */
export function useAccountList<T extends { id: string }>(options: {
  endpoint: string;
  field: string;
  idPrefix: string;
  loadLegacy: () => T[];
  clearLegacy: () => void;
}) {
  const { loadLegacy, clearLegacy } = options;
  const { value: items, edit } = useAccountRecord<T[]>({
    endpoint: options.endpoint,
    field: options.field,
    label: options.field,
    initial: [],
    fromServer: (server) => {
      const saved = Array.isArray(server) ? (server as T[]) : [];
      const legacy = loadLegacy();
      return saved.length === 0 && legacy.length > 0 ? { value: legacy, save: true } : { value: saved, save: false };
    },
    afterSync: clearLegacy,
  });

  const add = useCallback(
    (input: Omit<T, "id">) => {
      const created = { ...input, id: newId(options.idPrefix) } as T;
      edit((current) => [...current, created]);
      return created;
    },
    [edit, options.idPrefix]
  );

  const update = useCallback(
    (id: string, patch: Partial<T>) => {
      edit((current) => current.map((item) => (item.id === id ? { ...item, ...patch, id: item.id } : item)));
    },
    [edit]
  );

  const remove = useCallback(
    (id: string) => {
      edit((current) => current.filter((item) => item.id !== id));
    },
    [edit]
  );

  return { items, add, update, remove };
}
