/**
 * Currencies offered in financial planning, and exchange-rate retrieval.
 *
 * Rates come from a real service or not at all: when the service cannot be
 * reached, callers get `null` and the UI says rates are unavailable. Nothing
 * here ever invents or hardcodes a market rate.
 */
import { AFRICAN_COUNTRIES } from "@/src/lib/african-countries"

/** Shown first in pickers. */
export const PRIMARY_CURRENCIES = ["XAF", "NGN", "GHS", "KES", "ZAR", "XOF", "USD", "EUR"] as const

export const SUPPORTED_CURRENCIES: string[] = Array.from(
  new Set<string>([...PRIMARY_CURRENCIES, ...AFRICAN_COUNTRIES.map((country) => country.currency), "GBP"]),
)

export function isSupportedCurrency(code: unknown): code is string {
  return typeof code === "string" && SUPPORTED_CURRENCIES.includes(code.toUpperCase())
}

/** Currencies normally written without decimals. */
const ZERO_DECIMAL = new Set(["XAF", "XOF", "UGX", "RWF", "BIF", "GNF", "KMF", "DJF", "MGA", "TZS", "CDF", "SOS"])

export function formatMoney(value: number, currency: string, locale = "en"): string {
  if (!Number.isFinite(value)) return "—"
  const digits = ZERO_DECIMAL.has(currency) || Math.abs(value) >= 1000 ? 0 : 2
  return `${value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${currency}`
}

/** 12,500,000 -> "12.5M" for chart axes and compact tiles. */
export function compactNumber(value: number, locale = "en"): string {
  if (!Number.isFinite(value)) return "—"
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

export interface ExchangeRates {
  base: string
  /** Units of each currency per one unit of `base`. */
  rates: Record<string, number>
  /** When the provider last updated these rates (ISO). */
  updatedAt: string
  provider: string
  providerUrl: string
}

const DEFAULT_RATES_URL = "https://open.er-api.com/v6/latest"

/**
 * Latest rates for `base`, cached for six hours. Returns null on any failure.
 * The endpoint can be replaced with EXCHANGE_RATES_API_URL (same response
 * shape: { result: "success", rates: {...}, time_last_update_unix }).
 */
export async function fetchExchangeRates(base: string): Promise<ExchangeRates | null> {
  const code = base.toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return null
  const endpoint = (process.env.EXCHANGE_RATES_API_URL || DEFAULT_RATES_URL).replace(/\/$/, "")

  try {
    const response = await fetch(`${endpoint}/${code}`, {
      next: { revalidate: 6 * 60 * 60 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const data = (await response.json()) as {
      result?: string
      rates?: Record<string, unknown>
      time_last_update_unix?: number
    }
    if (data.result !== "success" || !data.rates || typeof data.time_last_update_unix !== "number") return null

    const rates: Record<string, number> = {}
    for (const currency of SUPPORTED_CURRENCIES) {
      const rate = data.rates[currency]
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) rates[currency] = rate
    }
    if (!Object.keys(rates).length) return null

    return {
      base: code,
      rates,
      updatedAt: new Date(data.time_last_update_unix * 1000).toISOString(),
      provider: "ExchangeRate-API",
      providerUrl: "https://www.exchangerate-api.com",
    }
  } catch {
    return null
  }
}

export function convertAmount(amount: number, to: string, rates: ExchangeRates): number | null {
  const rate = rates.rates[to.toUpperCase()]
  return typeof rate === "number" ? amount * rate : null
}
