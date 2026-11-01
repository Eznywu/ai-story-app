"use client";

import { BrandMark } from "@/app/components/BrandMark";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { useInterfaceLocale } from "@/app/components/LocaleProvider";
import { BRAND_NAME, BRAND_PROMISE } from "@/lib/brand";
import "./EntryScreen.css";

type Props = {
  onFirstStory: () => void;
  onReturning: () => void;
};

/**
 * First-visit welcome. It stays until the parent chooses a route.
 * Returning parents who already finished setup never see this screen.
 */
export function EntryScreen({ onFirstStory, onReturning }: Props) {
  const { messages } = useInterfaceLocale();
  return (
    <div className="welcome">
      <LanguageSwitcher className="welcome__language" />
      <div className="welcome__markWrap">
        <BrandMark variant="onDark" className="welcome__mark" label={null} />
      </div>
      <h1 className="welcome__wordmark">{BRAND_NAME}</h1>
      <p className="welcome__promise">{BRAND_PROMISE}</p>
      <div className="welcome__actions">
        <button className="button buttonPrimary welcome__primary" type="button" onClick={onFirstStory}>
          {messages.welcome.first}
        </button>
        <button className="welcome__secondary" type="button" onClick={onReturning}>
          {messages.welcome.returning}
        </button>
      </div>
      <p className="welcome__legal">
        <a href="/legal/privacy">{messages.welcome.privacy}</a>
        <span aria-hidden="true"> · </span>
        <a href="/legal/terms">{messages.welcome.terms}</a>
      </p>
    </div>
  );
}
