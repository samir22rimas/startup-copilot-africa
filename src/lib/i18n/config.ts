export const LOCALES = ["en", "fr"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "anza_locale"

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  fr: "Français",
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

/** Picks a supported locale from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE
  const preferred = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=")
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 }
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q)
  for (const { tag } of preferred) {
    const base = tag.split("-")[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

/** Replaces {name} placeholders: fmt("Hello {name}", { name: "Awa" }). */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}
