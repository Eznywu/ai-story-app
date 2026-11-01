"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clientJson } from "@/lib/auth/clientApi";

type Options<V> = {
  /** GET returns `{ [field]: value }`; PUT accepts the same shape. */
  endpoint: string;
  field: string;
  label: string;
  initial: V;
  /** Value to show for what the server returned. `save` writes the result back (for example a migrated local copy). */
  fromServer: (server: unknown) => { value: V; save: boolean };
  /** Runs once the server holds the loaded value, e.g. to drop an old localStorage copy. */
  afterSync?: () => void;
};

/**
 * One family record stored on the account (kids, characters, reading stats).
 *
 * Edits show at once. Until the first load finishes they are kept and replayed on top of the
 * server copy, so an early edit cannot overwrite saved data with a near-empty value. If the
 * load fails nothing is written; the next edit tries the load again.
 */
export function useAccountRecord<V>({ endpoint, field, label, initial, fromServer, afterSync }: Options<V>) {
  const [value, setValue] = useState<V>(initial);
  const valueRef = useRef<V>(initial);
  const synced = useRef(false);
  const loading = useRef<Promise<void> | null>(null);
  const pending = useRef<((current: V) => V)[]>([]);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const options = useRef({ fromServer, afterSync });
  options.current = { fromServer, afterSync };

  const show = useCallback((next: V) => {
    valueRef.current = next;
    setValue(next);
  }, []);

  const persist = useCallback(
    (next: V) => {
      const write = writes.current.then(() =>
        clientJson(endpoint, { method: "PUT", body: JSON.stringify({ [field]: next }) })
      );
      writes.current = write.catch((error: unknown) => {
        console.error(`[${label}] save failed`, error);
      });
      return write;
    },
    [endpoint, field, label]
  );

  const load = useCallback(() => {
    loading.current ??= (async () => {
      try {
        const data = await clientJson<Record<string, unknown>>(endpoint);
        const loaded = options.current.fromServer(data[field]);
        let next = loaded.value;
        for (const change of pending.current) next = change(next);
        const save = loaded.save || pending.current.length > 0;
        pending.current = [];
        synced.current = true;
        show(next);
        if (save) await persist(next);
        options.current.afterSync?.();
      } catch (error: unknown) {
        console.error(`[${label}] load failed`, error);
      } finally {
        loading.current = null;
      }
    })();
    return loading.current;
  }, [endpoint, field, label, persist, show]);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = useCallback(
    (change: (current: V) => V) => {
      const next = change(valueRef.current);
      if (synced.current && Object.is(next, valueRef.current)) return next;
      show(next);
      if (synced.current) {
        void persist(next).catch(() => {});
        return next;
      }
      pending.current.push(change);
      void load();
      return next;
    },
    [load, persist, show]
  );

  return { value, edit };
}
