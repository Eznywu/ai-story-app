"use client";

import { AppChromeBar } from "@/app/components/AppChromeBar";
import { BackButton } from "@/app/components/BackButton";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { fill } from "@/lib/i18n/locales";

export function LegalIntro({ kind, year, month, day }: { kind: "privacy" | "terms"; year: number; month: number; day: number }) {
  const { messages, formatDate } = useInterfaceLocale();
  const copy = messages.legal;
  const title = kind === "privacy" ? copy.privacyTitle : copy.termsTitle;
  const date = formatDate(new Date(year, month - 1, day));
  return (
    <>
      <AppChromeBar />
      <div className="legalDoc__back">
        <BackButton className="button" />
      </div>
      <h1>{title}</h1>
      <p className="legalDoc__meta">{fill(copy.updated, { date })}</p>
      <p className="legalDoc__note">{copy.englishBody}</p>
    </>
  );
}
