import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveInterfaceLocale, type InterfaceLocale } from "./locales";

/** Cookie wins, then Accept-Language, then English. Used so SSR matches the device. */
export async function getRequestLocale(): Promise<{ locale: InterfaceLocale; cookieWasSet: boolean }> {
  const jar = await cookies();
  const hdrs = await headers();
  const cookie = jar.get(LOCALE_COOKIE)?.value ?? null;
  return {
    locale: resolveInterfaceLocale({ cookie, acceptLanguage: hdrs.get("accept-language") }),
    cookieWasSet: Boolean(cookie),
  };
}
