"use client"

import { Loader2, RefreshCw } from "lucide-react"
import * as React from "react"

import { getExchangeRates } from "@/src/app/actions/finance"
import { Field, Notice, Panel, PanelHeader, inputClass, secondaryButtonClass } from "@/src/components/ui/page"
import {
  breakEven,
  cashFlow,
  monthlyOperatingExpenses,
  pricing,
  profitMargin,
  revenueGrowth,
  startupCapital,
} from "@/src/lib/finance/calculators"
import { PRIMARY_CURRENCIES, SUPPORTED_CURRENCIES, convertAmount, formatMoney, type ExchangeRates } from "@/src/lib/finance/currency"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { cn } from "@/src/lib/utils"

type CalculatorId = "breakEven" | "margin" | "growth" | "capital" | "opex" | "pricing" | "cashFlow"

const CALCULATORS: CalculatorId[] = ["breakEven", "margin", "growth", "capital", "opex", "pricing", "cashFlow"]

function NumberField({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  const id = React.useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input id={id} type="number" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, "tabular")} />
    </Field>
  )
}

function Result({ rows, empty }: { rows: Array<[string, string]> | null; empty: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-4" aria-live="polite">
      {rows ? (
        <dl className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}

const n = (value: string) => (value.trim() === "" ? NaN : Number(value))

export function FinanceTools({ currency }: { currency: string }) {
  const { t, locale } = useI18n()
  const c = t.finance.calc
  const [active, setActive] = React.useState<CalculatorId>("breakEven")
  const [v, setV] = React.useState<Record<string, string>>({ months: "12", buffer: "3", contingency: "10" })
  const set = (key: string) => (value: string) => setV((current) => ({ ...current, [key]: value }))
  const get = (key: string) => v[key] ?? ""
  const money = (value: number) => formatMoney(value, currency, locale)

  let fields: React.ReactNode = null
  let rows: Array<[string, string]> | null = null

  if (active === "breakEven") {
    const r = breakEven({ fixedCosts: n(get("be_fixed")), pricePerUnit: n(get("be_price")), variableCostPerUnit: n(get("be_cost")) })
    fields = (
      <>
        <NumberField label={c.fixedCosts} value={get("be_fixed")} onChange={set("be_fixed")} />
        <NumberField label={c.pricePerUnit} value={get("be_price")} onChange={set("be_price")} />
        <NumberField label={c.costPerUnit} value={get("be_cost")} onChange={set("be_cost")} />
      </>
    )
    rows = r && [
      [c.unitsToBreakEven, r.units.toLocaleString(locale)],
      [c.revenueToBreakEven, money(r.revenue)],
      [c.contributionPerUnit, money(r.contributionPerUnit)],
      [c.contributionMargin, `${r.contributionMarginPct}%`],
    ]
  } else if (active === "margin") {
    const r = profitMargin({ revenue: n(get("pm_rev")), costOfSales: n(get("pm_cogs")), operatingExpenses: n(get("pm_opex") || "0") })
    fields = (
      <>
        <NumberField label={c.revenue} value={get("pm_rev")} onChange={set("pm_rev")} />
        <NumberField label={c.costOfSales} value={get("pm_cogs")} onChange={set("pm_cogs")} />
        <NumberField label={c.operatingExpenses} value={get("pm_opex")} onChange={set("pm_opex")} />
      </>
    )
    rows = r && [
      [c.grossProfit, money(r.grossProfit)],
      [c.grossMargin, `${r.grossMarginPct}%`],
      [c.netProfit, money(r.netProfit)],
      [c.netMargin, `${r.netMarginPct}%`],
      ...(r.markupPct === null ? [] : ([[c.markup, `${r.markupPct}%`]] as Array<[string, string]>)),
    ]
  } else if (active === "growth") {
    const r = revenueGrowth({ startingMonthlyRevenue: n(get("rg_start")), monthlyGrowthPct: n(get("rg_rate")), months: n(get("months")) })
    fields = (
      <>
        <NumberField label={c.startingRevenue} value={get("rg_start")} onChange={set("rg_start")} />
        <NumberField label={c.growthRate} value={get("rg_rate")} onChange={set("rg_rate")} />
        <NumberField label={c.months} value={get("months")} onChange={set("months")} />
      </>
    )
    rows = r && [
      [c.finalMonthlyRevenue, money(r.finalMonthlyRevenue)],
      [c.totalRevenue, money(r.totalRevenue)],
      ...(r.multiple === null ? [] : ([[c.multiple, `× ${r.multiple}`]] as Array<[string, string]>)),
    ]
  } else if (active === "capital") {
    const r = startupCapital({
      oneOffCosts: n(get("sc_once")),
      monthlyOperatingCosts: n(get("sc_monthly")),
      monthsOfBuffer: n(get("buffer")),
      contingencyPct: n(get("contingency")),
    })
    fields = (
      <>
        <NumberField label={c.oneOffCosts} value={get("sc_once")} onChange={set("sc_once")} />
        <NumberField label={c.monthlyCosts} value={get("sc_monthly")} onChange={set("sc_monthly")} />
        <NumberField label={c.bufferMonths} value={get("buffer")} onChange={set("buffer")} hint={c.bufferHint} />
        <NumberField label={c.contingency} value={get("contingency")} onChange={set("contingency")} />
      </>
    )
    rows = r && [
      [c.workingCapital, money(r.workingCapital)],
      [c.contingencyAmount, money(r.contingency)],
      [c.capitalNeeded, money(r.total)],
    ]
  } else if (active === "opex") {
    const keys = ["ox_rent", "ox_salaries", "ox_utilities", "ox_transport", "ox_marketing", "ox_other"] as const
    const labels = [c.rent, c.salaries, c.utilities, c.transport, c.marketingSpend, c.other]
    const r = monthlyOperatingExpenses(keys.map((key) => n(get(key) || "0")))
    fields = keys.map((key, index) => <NumberField key={key} label={labels[index]} value={get(key)} onChange={set(key)} />)
    rows = r && r.total > 0 ? [[c.perMonth, money(r.total)], [c.perYear, money(r.yearly)], [c.perDay, money(r.daily)]] : null
  } else if (active === "pricing") {
    const r = pricing({ unitCost: n(get("pr_cost")), targetMarginPct: n(get("pr_margin")), taxPct: n(get("pr_tax") || "0") })
    fields = (
      <>
        <NumberField label={c.costPerUnit} value={get("pr_cost")} onChange={set("pr_cost")} />
        <NumberField label={c.targetMargin} value={get("pr_margin")} onChange={set("pr_margin")} hint={c.targetMarginHint} />
        <NumberField label={c.tax} value={get("pr_tax")} onChange={set("pr_tax")} hint={c.taxHint} />
      </>
    )
    rows = r && [
      [c.sellingPrice, money(r.price)],
      [c.profitPerUnit, money(r.profitPerUnit)],
      ...(r.markupPct === null ? [] : ([[c.markup, `${r.markupPct}%`]] as Array<[string, string]>)),
      ...(n(get("pr_tax")) > 0 ? ([[c.priceWithTax, money(r.priceWithTax)]] as Array<[string, string]>) : []),
    ]
  } else {
    const r = cashFlow({ openingBalance: n(get("cf_open")), monthlyInflow: n(get("cf_in")), monthlyOutflow: n(get("cf_out")), months: n(get("months")) })
    fields = (
      <>
        <NumberField label={c.openingBalance} value={get("cf_open")} onChange={set("cf_open")} />
        <NumberField label={c.monthlyInflow} value={get("cf_in")} onChange={set("cf_in")} />
        <NumberField label={c.monthlyOutflow} value={get("cf_out")} onChange={set("cf_out")} />
        <NumberField label={c.months} value={get("months")} onChange={set("months")} />
      </>
    )
    rows = r && [
      [c.netMonthly, money(r.netMonthly)],
      [c.closingBalance, money(r.closingBalance)],
      [c.cashRunsOut, r.firstNegativeMonth === null ? c.never : fmt(t.finance.monthN, { n: r.firstNegativeMonth })],
    ]
  }

  return (
    <div className="space-y-5">
      <Panel>
        <PanelHeader title={c.title} description={fmt(c.description, { currency })} />
        <div className="grid gap-5 p-4 lg:grid-cols-[13rem_1fr]">
          <div role="tablist" aria-label={c.title} aria-orientation="vertical" className="flex gap-1 overflow-x-auto lg:flex-col">
            {CALCULATORS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={id === active}
                onClick={() => setActive(id)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-left text-[13px] transition",
                  id === active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {c.names[id]}
              </button>
            ))}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">{fields}</div>
            <div className="space-y-3">
              <Result rows={rows} empty={c.enterValues} />
              <p className="text-xs leading-relaxed text-muted-foreground">{c.explain[active]}</p>
            </div>
          </div>
        </div>
      </Panel>

      <CurrencyConverter defaultFrom={currency} />
    </div>
  )
}

function CurrencyConverter({ defaultFrom }: { defaultFrom: string }) {
  const { t, locale } = useI18n()
  const x = t.finance.fx
  const [from, setFrom] = React.useState(defaultFrom)
  const [amount, setAmount] = React.useState("1000")
  const [rates, setRates] = React.useState<ExchangeRates | null>(null)
  const [state, setState] = React.useState<"idle" | "loading" | "unavailable">("idle")

  const load = React.useCallback(async (base: string) => {
    setState("loading")
    try {
      const result = await getExchangeRates(base)
      setRates(result)
      setState(result ? "idle" : "unavailable")
    } catch {
      setRates(null)
      setState("unavailable")
    }
  }, [])

  const value = Number(amount)
  const targets = PRIMARY_CURRENCIES.filter((code) => code !== from)

  return (
    <Panel>
      <PanelHeader
        title={x.title}
        description={x.description}
        actions={
          <button type="button" onClick={() => load(from)} disabled={state === "loading"} className={secondaryButtonClass}>
            {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {rates?.base === from ? x.refresh : x.load}
          </button>
        }
      />
      <div className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={x.amount} htmlFor="fx-amount">
            <input id="fx-amount" type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} className={cn(inputClass, "tabular")} />
          </Field>
          <Field label={x.from} htmlFor="fx-from">
            <select
              id="fx-from"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setRates(null)
              }}
              className={inputClass}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {state === "unavailable" && (
          <Notice tone="warning" title={x.unavailableTitle}>
            {x.unavailableBody}
          </Notice>
        )}

        {rates && rates.base === from && Number.isFinite(value) && value >= 0 && (
          <>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {targets.map((code) => {
                const converted = convertAmount(value, code, rates)
                return (
                  <li key={code} className="rounded-lg border border-border px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">{code}</p>
                    <p className="tabular mt-0.5 text-sm font-semibold text-foreground">
                      {converted === null ? x.noRate : formatMoney(converted, code, locale)}
                    </p>
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              {fmt(x.updated, { date: new Date(rates.updatedAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) })}{" "}
              <a href={rates.providerUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {fmt(x.attribution, { provider: rates.provider })}
              </a>
              . {x.indicative}
            </p>
          </>
        )}

        {!rates && state === "idle" && <p className="text-sm text-muted-foreground">{x.prompt}</p>}
      </div>
    </Panel>
  )
}
