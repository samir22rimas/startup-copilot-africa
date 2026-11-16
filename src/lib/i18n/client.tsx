"use client"

import * as React from "react"

import { DEFAULT_LOCALE, type Locale } from "./config"
import { dictionaries, type Dictionary } from "./dictionaries"

const I18nContext = React.createContext<Locale>(DEFAULT_LOCALE)

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>
}

/** Current language and its strings: `const { t } = useI18n(); t.common.save`. */
export function useI18n(): { locale: Locale; t: Dictionary } {
  const locale = React.useContext(I18nContext)
  return { locale, t: dictionaries[locale] }
}
