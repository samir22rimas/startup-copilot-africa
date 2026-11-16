import { cookies, headers } from "next/headers"

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./config"
import { dictionaries, type Dictionary } from "./dictionaries"

/** The visitor's language: their saved choice, else the browser's, else English. */
export async function getLocale(): Promise<Locale> {
  try {
    const saved = (await cookies()).get(LOCALE_COOKIE)?.value
    if (isLocale(saved)) return saved
    return localeFromAcceptLanguage((await headers()).get("accept-language"))
  } catch {
    return DEFAULT_LOCALE
  }
}

export async function getI18n(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale()
  return { locale, t: dictionaries[locale] }
}
