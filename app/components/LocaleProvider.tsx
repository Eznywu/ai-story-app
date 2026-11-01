"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMessages, type Messages } from "@/lib/i18n/catalog";
import {
  formatClock,
  formatDate,
  formatNumber,
  isInterfaceLocale,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  localeMeta,
  type InterfaceLocale,
} from "@/lib/i18n/locales";

type LocaleContextValue = {
  locale: InterfaceLocale;
  messages: Messages;
  setLocale: (locale: InterfaceLocale) => void;
  formatNumber: (value: number) => string;
  formatDate: (value: Date) => string;
  formatClock: (seconds: number) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function writeLocaleCookie(locale: InterfaceLocale) {
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function applyDocument(locale: InterfaceLocale) {
  const meta = localeMeta(locale);
  document.documentElement.lang = meta.htmlLang;
  document.documentElement.dir = meta.dir;
}

export function LocaleProvider({
  initialLocale,
  cookieWasSet,
  children,
}: {
  initialLocale: InterfaceLocale;
  cookieWasSet: boolean;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<InterfaceLocale>(initialLocale);

  const setLocale = useCallback((next: InterfaceLocale) => {
    setLocaleState(next);
    writeLocaleCookie(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
    applyDocument(next);
  }, []);

  useEffect(() => {
    applyDocument(locale);
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (!cookieWasSet && isInterfaceLocale(stored) && stored !== locale) {
        setLocale(stored);
        return;
      }
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      if (!cookieWasSet) writeLocaleCookie(locale);
    } catch {
      /* private mode */
    }
    // Seed once from the server locale. Later switches go through setLocale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      messages: getMessages(locale),
      setLocale,
      formatNumber: (value) => formatNumber(locale, value),
      formatDate: (value) => formatDate(locale, value),
      formatClock: (seconds) => formatClock(locale, seconds),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useInterfaceLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("Interface language is still loading.");
  }
  return value;
}
