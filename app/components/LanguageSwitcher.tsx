"use client";

import { useState } from "react";
import { QuietSheet } from "@/app/components/QuietSheet";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { INTERFACE_LOCALES, type InterfaceLocale } from "@/lib/i18n/locales";

function GlobeIcon() {
  return (
    <svg className="languageButton__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.75 12h16.5M12 3.75c2.2 2.4 3.3 5.2 3.3 8.25s-1.1 5.85-3.3 8.25c-2.2-2.4-3.3-5.2-3.3-8.25s1.1-5.85 3.3-8.25z" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

type Props = {
  className?: string;
};

/**
 * Interface language. Top-end of the header and the welcome screen.
 * Choosing a language updates chrome immediately and does not touch story language.
 */
export function LanguageSwitcher({ className }: Props) {
  const { locale, messages, setLocale } = useInterfaceLocale();
  const [open, setOpen] = useState(false);

  function choose(next: InterfaceLocale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div className={className}>
      <button
        type="button"
        className="languageButton"
        data-testid="interface-language-button"
        aria-label={messages.language.open}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <GlobeIcon />
      </button>
      {open ? (
        <QuietSheet title={messages.language.title} closeLabel={messages.language.close} onClose={() => setOpen(false)} className="quietSheet--language">
          <div className="languageSheet" role="radiogroup" aria-label={messages.language.title}>
            {INTERFACE_LOCALES.map((item) => {
              const selected = item.code === locale;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`languageOption${selected ? " languageOption--current" : ""}`}
                  lang={item.htmlLang}
                  dir={item.dir}
                  onClick={() => choose(item.code)}
                >
                  <span className="languageOption__name">{item.nativeName}</span>
                  {selected ? (
                    <span className="languageOption__check" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </QuietSheet>
      ) : null}
    </div>
  );
}
