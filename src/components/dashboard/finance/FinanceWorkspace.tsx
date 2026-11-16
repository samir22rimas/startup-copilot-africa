"use client"

import { Check, ClipboardCheck, Loader2, Plus, Trash2 } from "lucide-react"
import dynamic from "next/dynamic"
import * as React from "react"
import { toast } from "sonner"

import { reviewFinancialModel, saveFinancialModel, type FinanceReview, type FinanceState } from "@/src/app/actions/finance"
import { FinanceTools } from "@/src/components/dashboard/finance/FinanceTools"
import { ExportMenu } from "@/src/components/shared/ExportMenu"
import { Modal, Tabs } from "@/src/components/ui/overlay"
import {
  Badge,
  Field,
  Notice,
  Panel,
  PanelHeader,
  ghostButtonClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/src/components/ui/page"
import { SUPPORTED_CURRENCIES, formatMoney } from "@/src/lib/finance/currency"
import {
  COST_CATEGORIES,
  HORIZONS,
  modelHasData,
  projectMonths,
  summarizeModel,
  yearlyTotals,
  type CostCategory,
  type FinancialModel,
} from "@/src/lib/finance/model"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { cn } from "@/src/lib/utils"

const CashChart = dynamic(() => import("./CashChart").then((m) => m.CashChart), { ssr: false })

type Tab = "inputs" | "projections" | "tools"
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error"

const newId = () => Math.random().toString(36).slice(2, 10)
const num = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function NumberCell({
  value,
  onChange,
  label,
  disabled,
  allowNegative = false,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  allowNegative?: boolean
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      disabled={disabled}
      min={allowNegative ? undefined : 0}
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => {
        const parsed = Number(event.target.value)
        onChange(Number.isFinite(parsed) ? (allowNegative ? parsed : Math.max(0, parsed)) : 0)
      }}
      onFocus={(event) => event.target.select()}
      className={cn(inputClass, "tabular h-8 text-right")}
    />
  )
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "bad" | "good" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-lg font-semibold",
          tone === "bad" ? "text-red-600 dark:text-red-400" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function FinanceWorkspace({
  initial,
  startupName,
  canEdit,
}: {
  initial: FinanceState
  startupName: string
  canEdit: boolean
}) {
  const { t, locale } = useI18n()
  const f = t.finance
  const [tab, setTab] = React.useState<Tab>("inputs")
  const [model, setModel] = React.useState<FinancialModel>(initial.model)
  const [saveState, setSaveState] = React.useState<SaveState>("idle")
  const [reviewing, setReviewing] = React.useState(false)
  const [review, setReview] = React.useState<FinanceReview | null>(null)

  const months = React.useMemo(() => projectMonths(model), [model])
  const summary = React.useMemo(() => summarizeModel(model, months), [model, months])
  const years = React.useMemo(() => yearlyTotals(months), [months])
  const hasData = modelHasData(model)
  const money = (value: number | null) => (value === null ? "—" : formatMoney(value, model.currency, locale))

  const latest = React.useRef(model)
  const timer = React.useRef<number | null>(null)
  const dirty = React.useRef(false)

  const flush = React.useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    setSaveState("saving")
    const result = await saveFinancialModel(latest.current)
    if (!result.success) {
      setSaveState("error")
      toast.error(result.error)
      return
    }
    setSaveState(dirty.current ? "dirty" : "saved")
  }, [])

  const update = React.useCallback(
    (patch: Partial<FinancialModel>) => {
      setModel((current) => {
        const next = { ...current, ...patch }
        latest.current = next
        return next
      })
      if (!canEdit) return
      dirty.current = true
      setSaveState("dirty")
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, 1200)
    },
    [canEdit, flush],
  )

  React.useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
      void flush()
    },
    [flush],
  )

  async function handleReview() {
    setReviewing(true)
    try {
      if (timer.current) window.clearTimeout(timer.current)
      await flush()
      const result = await reviewFinancialModel()
      if (!result.success) return void toast.error(result.error)
      setReview(result.review)
    } finally {
      setReviewing(false)
    }
  }

  async function exportModel(format: "pdf" | "docx") {
    const { exportReport } = await import("@/src/lib/export")
    const row = (cells: Array<string | number>) => `| ${cells.join(" | ")} |`
    await exportReport(
      format,
      {
        startupName,
        title: f.exportTitle,
        generatedAt: new Date().toISOString(),
        sections: [
          { heading: f.projectionNoticeTitle, markdown: f.projectionNotice },
          {
            heading: f.keyFigures,
            markdown: [
              row([f.indicator, f.value]),
              row(["---", "---"]),
              row([f.totalStartup, money(summary.totalStartupCosts)]),
              row([f.monthlyFixed, money(summary.monthlyFixedCosts)]),
              row([fmt(f.revenueOver, { months: model.horizonMonths }), money(summary.totalRevenue)]),
              row([fmt(f.netOver, { months: model.horizonMonths }), money(summary.netProfit)]),
              row([f.grossMargin, summary.grossMarginPct === null ? "—" : `${summary.grossMarginPct}%`]),
              row([f.breakEvenUnits, summary.breakEvenUnitsPerMonth ?? "—"]),
              row([f.breakEvenMonth, summary.breakEvenMonth ?? f.notReached]),
              row([f.fundingRequired, money(summary.fundingRequired)]),
            ].join("\n"),
          },
          {
            heading: f.startupCosts,
            markdown: model.startupCosts.length
              ? [row([f.category, f.item, f.amount]), row(["---", "---", "---"]), ...model.startupCosts.map((c) => row([f.categories[c.category], c.label || "—", money(c.amount)]))].join("\n")
              : "—",
          },
          {
            heading: f.yearlyPnl,
            markdown: [
              row([f.year, f.revenue, f.variableCosts, f.fixedCosts, f.netProfit, f.endingCash]),
              row(["---", "---", "---", "---", "---", "---"]),
              ...years.map((y) => row([y.year, money(y.revenue), money(y.variableCosts), money(y.fixedCosts), money(y.netProfit), money(y.endingCash)])),
            ].join("\n"),
          },
        ],
      },
      "financial-plan",
    )
  }

  function costTable(key: "startupCosts" | "monthlyExpenses", title: string, description: string) {
    const rows = model[key]
    const total = rows.reduce((sum, item) => sum + item.amount, 0)
    const setRows = (next: typeof rows) => update({ [key]: next } as Partial<FinancialModel>)
    return (
      <Panel>
        <PanelHeader
          title={title}
          description={description}
          actions={<span className="tabular text-sm font-semibold text-foreground">{money(total)}</span>}
        />
        <div className="space-y-2 p-4">
          {rows.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[1fr_2.25rem] items-center gap-2 sm:grid-cols-[11rem_1fr_9rem_2.25rem]">
              <select
                aria-label={f.category}
                disabled={!canEdit}
                value={item.category}
                onChange={(event) => setRows(rows.map((r, i) => (i === index ? { ...r, category: event.target.value as CostCategory } : r)))}
                className={cn(inputClass, "col-span-2 h-8 sm:col-span-1")}
              >
                {COST_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {f.categories[category]}
                  </option>
                ))}
              </select>
              <input
                aria-label={f.item}
                disabled={!canEdit}
                value={item.label}
                maxLength={120}
                placeholder={f.itemPlaceholder}
                onChange={(event) => setRows(rows.map((r, i) => (i === index ? { ...r, label: event.target.value } : r)))}
                className={cn(inputClass, "col-span-2 h-8 sm:col-span-1")}
              />
              <NumberCell label={f.amount} disabled={!canEdit} value={item.amount} onChange={(amount) => setRows(rows.map((r, i) => (i === index ? { ...r, amount } : r)))} />
              {canEdit && (
                <button type="button" aria-label={t.common.remove} onClick={() => setRows(rows.filter((_, i) => i !== index))} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          {canEdit && rows.length < 60 && (
            <button type="button" className={ghostButtonClass} onClick={() => setRows([...rows, { id: newId(), category: "other", label: "", amount: 0 }])}>
              <Plus className="size-3.5" /> {f.addLine}
            </button>
          )}
        </div>
      </Panel>
    )
  }

  const statusLabel: Record<SaveState, string> = {
    idle: "",
    dirty: t.model.unsaved,
    saving: t.common.saving,
    saved: t.model.allSaved,
    error: t.model.saveFailed,
  }

  return (
    <div className="space-y-5">
      <Notice tone="warning" title={f.projectionNoticeTitle}>
        {f.projectionNotice}
      </Notice>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          label={t.pages.finance.title}
          className="border-0"
          items={[
            { id: "inputs", label: f.tabInputs },
            { id: "projections", label: f.tabProjections },
            { id: "tools", label: f.tabTools },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span aria-live="polite" className={cn("flex items-center gap-1.5 text-xs", saveState === "error" ? "text-red-600" : "text-muted-foreground")}>
            {saveState === "saving" && <Loader2 className="size-3.5 animate-spin" />}
            {saveState === "saved" && <Check className="size-3.5 text-primary" />}
            {statusLabel[saveState]}
          </span>
          {canEdit && (
            <button type="button" onClick={handleReview} disabled={reviewing || !hasData} className={secondaryButtonClass}>
              {reviewing ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />} {f.review}
            </button>
          )}
          {hasData && (
            <ExportMenu
              label={t.common.download}
              className={secondaryButtonClass}
              options={[
                { id: "pdf", label: t.common.pdf, hint: t.common.pdfHint, run: () => exportModel("pdf") },
                { id: "docx", label: t.common.docx, hint: t.common.docxHint, run: () => exportModel("docx") },
              ]}
            />
          )}
        </div>
      </div>

      {!canEdit && <Notice tone="locked">{t.common.readOnly}</Notice>}

      {tab === "inputs" && (
        <div className="space-y-5">
          <Panel className="grid gap-4 p-4 sm:grid-cols-3">
            <Field label={f.currency} htmlFor="fin-currency">
              <select id="fin-currency" disabled={!canEdit} value={model.currency} onChange={(event) => update({ currency: event.target.value })} className={inputClass}>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={f.horizon} htmlFor="fin-horizon">
              <select id="fin-horizon" disabled={!canEdit} value={model.horizonMonths} onChange={(event) => update({ horizonMonths: Number(event.target.value) })} className={inputClass}>
                {HORIZONS.map((months) => (
                  <option key={months} value={months}>
                    {fmt(f.months, { months })}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={f.startingCash} hint={f.startingCashHint}>
              <NumberCell label={f.startingCash} disabled={!canEdit} value={model.startingCash} onChange={(startingCash) => update({ startingCash })} />
            </Field>
          </Panel>

          {costTable("startupCosts", f.startupCosts, f.startupCostsHint)}

          <Panel>
            <PanelHeader title={f.revenueStreams} description={f.revenueStreamsHint} />
            <div className="space-y-3 p-4">
              {model.revenueStreams.map((stream, index) => {
                const set = (patch: Partial<typeof stream>) =>
                  update({ revenueStreams: model.revenueStreams.map((s, i) => (i === index ? { ...s, ...patch } : s)) })
                return (
                  <div key={stream.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <input aria-label={f.streamName} disabled={!canEdit} value={stream.name} maxLength={120} placeholder={f.streamPlaceholder} onChange={(event) => set({ name: event.target.value })} className={cn(inputClass, "h-8")} />
                      {canEdit && (
                        <button type="button" aria-label={t.common.remove} onClick={() => update({ revenueStreams: model.revenueStreams.filter((_, i) => i !== index) })} className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label={f.unitPrice}>
                        <NumberCell label={f.unitPrice} disabled={!canEdit} value={stream.unitPrice} onChange={(unitPrice) => set({ unitPrice })} />
                      </Field>
                      <Field label={f.unitsMonth1}>
                        <NumberCell label={f.unitsMonth1} disabled={!canEdit} value={stream.unitsMonth1} onChange={(unitsMonth1) => set({ unitsMonth1 })} />
                      </Field>
                      <Field label={f.monthlyGrowth}>
                        <NumberCell label={f.monthlyGrowth} disabled={!canEdit} allowNegative value={stream.monthlyGrowthPct} onChange={(value) => set({ monthlyGrowthPct: Math.min(200, Math.max(-50, value)) })} />
                      </Field>
                      <Field label={f.unitCost}>
                        <NumberCell label={f.unitCost} disabled={!canEdit} value={stream.variableCostPerUnit} onChange={(variableCostPerUnit) => set({ variableCostPerUnit })} />
                      </Field>
                    </div>
                    {stream.unitPrice > 0 && stream.variableCostPerUnit >= stream.unitPrice && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">{f.negativeMargin}</p>
                    )}
                  </div>
                )
              })}
              {canEdit && model.revenueStreams.length < 20 && (
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() =>
                    update({
                      revenueStreams: [...model.revenueStreams, { id: newId(), name: "", unitPrice: 0, unitsMonth1: 0, monthlyGrowthPct: 0, variableCostPerUnit: 0 }],
                    })
                  }
                >
                  <Plus className="size-3.5" /> {f.addStream}
                </button>
              )}
            </div>
          </Panel>

          {costTable("monthlyExpenses", f.monthlyExpenses, f.monthlyExpensesHint)}

          <Panel>
            <PanelHeader title={f.customersTitle} description={f.customersHint} />
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={f.newCustomers}>
                <NumberCell label={f.newCustomers} disabled={!canEdit} value={model.customers.newPerMonth} onChange={(newPerMonth) => update({ customers: { ...model.customers, newPerMonth } })} />
              </Field>
              <Field label={f.revenuePerCustomer}>
                <NumberCell label={f.revenuePerCustomer} disabled={!canEdit} value={model.customers.revenuePerCustomerMonthly} onChange={(revenuePerCustomerMonthly) => update({ customers: { ...model.customers, revenuePerCustomerMonthly } })} />
              </Field>
              <Field label={f.lifetime}>
                <NumberCell label={f.lifetime} disabled={!canEdit} value={model.customers.lifetimeMonths} onChange={(lifetimeMonths) => update({ customers: { ...model.customers, lifetimeMonths } })} />
              </Field>
              <Field label={f.expenseGrowth}>
                <NumberCell label={f.expenseGrowth} disabled={!canEdit} value={model.expenseGrowthPctYearly} onChange={(value) => update({ expenseGrowthPctYearly: Math.min(200, value) })} />
              </Field>
            </div>
          </Panel>
        </div>
      )}

      {tab === "projections" &&
        (!hasData ? (
          <Panel className="p-8 text-center text-sm text-muted-foreground">{f.noData}</Panel>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label={f.totalStartup} value={money(summary.totalStartupCosts)} />
              <Stat label={f.monthlyFixed} value={money(summary.monthlyFixedCosts)} />
              <Stat label={fmt(f.revenueOver, { months: model.horizonMonths })} value={money(summary.totalRevenue)} />
              <Stat label={fmt(f.netOver, { months: model.horizonMonths })} value={money(summary.netProfit)} tone={summary.netProfit < 0 ? "bad" : undefined} />
              <Stat label={f.grossMargin} value={summary.grossMarginPct === null ? "—" : `${summary.grossMarginPct}%`} hint={f.grossMarginHint} />
              <Stat
                label={f.breakEvenUnits}
                value={summary.breakEvenUnitsPerMonth === null ? "—" : summary.breakEvenUnitsPerMonth.toLocaleString(locale)}
                hint={summary.breakEvenUnitsPerMonth === null ? f.breakEvenImpossible : fmt(f.breakEvenRevenueHint, { amount: money(summary.breakEvenRevenuePerMonth) })}
              />
              <Stat
                label={f.breakEvenMonth}
                value={summary.breakEvenMonth === null ? f.notReached : fmt(f.monthN, { n: summary.breakEvenMonth })}
                tone={summary.breakEvenMonth === null ? "bad" : undefined}
                hint={f.breakEvenMonthHint}
              />
              <Stat
                label={f.fundingRequired}
                value={money(summary.fundingRequired)}
                tone={summary.fundingRequired > 0 ? "bad" : undefined}
                hint={summary.fundingRequired > 0 ? fmt(f.fundingHint, { n: summary.lowestCashMonth }) : f.fundingNone}
              />
              <Stat
                label={f.runway}
                value={summary.runwayMonths === null ? fmt(f.runwayBeyond, { months: model.horizonMonths }) : fmt(f.months, { months: summary.runwayMonths })}
                tone={summary.runwayMonths !== null ? "bad" : undefined}
                hint={f.runwayHint}
              />
              <Stat label={f.cac} value={money(summary.customerAcquisitionCost)} hint={f.cacHint} />
              <Stat label={f.ltv} value={money(summary.customerLifetimeValue)} hint={f.ltvHint} />
              <Stat label={f.ltvCac} value={summary.ltvToCacRatio === null ? "—" : `${summary.ltvToCacRatio} : 1`} hint={f.ltvCacHint} />
            </div>

            <Panel>
              <PanelHeader title={f.cashChartTitle} description={f.cashChartHint} actions={<Badge tone="blue">{f.projectionBadge}</Badge>} />
              <div className="p-4">
                <CashChart months={months} currency={model.currency} locale={locale} label={f.cashBalance} monthLabel={(n) => fmt(f.monthN, { n })} />
              </div>
            </Panel>

            <Panel>
              <PanelHeader title={f.yearlyPnl} actions={<Badge tone="blue">{f.projectionBadge}</Badge>} />
              <div className="overflow-x-auto">
                <table className="tabular w-full min-w-[36rem] border-collapse text-right text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">{f.year}</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">{f.revenue}</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">{f.variableCosts}</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">{f.grossProfit}</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">{f.fixedCosts}</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">{f.netProfit}</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">{f.endingCash}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((year) => (
                      <tr key={year.year} className="border-b border-border last:border-0">
                        <th scope="row" className="px-4 py-2.5 text-left font-medium text-foreground">{year.year}</th>
                        <td className="px-4 py-2.5">{money(year.revenue)}</td>
                        <td className="px-4 py-2.5">{money(year.variableCosts)}</td>
                        <td className="px-4 py-2.5">{money(year.grossProfit)}</td>
                        <td className="px-4 py-2.5">{money(year.fixedCosts)}</td>
                        <td className={cn("px-4 py-2.5 font-medium", year.netProfit < 0 && "text-red-600 dark:text-red-400")}>{money(year.netProfit)}</td>
                        <td className={cn("px-4 py-2.5", year.endingCash < 0 && "text-red-600 dark:text-red-400")}>{money(year.endingCash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title={f.monthlyTable} actions={<Badge tone="blue">{f.projectionBadge}</Badge>} />
              <div className="max-h-96 overflow-auto">
                <table className="tabular w-full min-w-[36rem] border-collapse text-right text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground">
                      <th scope="col" className="px-4 py-2 text-left font-medium">{f.month}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{f.units}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{f.revenue}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{f.variableCosts}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{f.fixedCosts}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{f.netProfit}</th>
                      <th scope="col" className="px-4 py-2 font-medium">{f.cashBalance}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m) => (
                      <tr key={m.month} className="border-b border-border last:border-0">
                        <th scope="row" className="px-4 py-2 text-left font-medium text-foreground">{m.month}</th>
                        <td className="px-4 py-2">{Math.round(m.units).toLocaleString(locale)}</td>
                        <td className="px-4 py-2">{money(m.revenue)}</td>
                        <td className="px-4 py-2">{money(m.variableCosts)}</td>
                        <td className="px-4 py-2">{money(m.fixedCosts)}</td>
                        <td className={cn("px-4 py-2", m.netProfit < 0 && "text-red-600 dark:text-red-400")}>{money(m.netProfit)}</td>
                        <td className={cn("px-4 py-2", m.cash < 0 && "text-red-600 dark:text-red-400")}>{money(m.cash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        ))}

      {tab === "tools" && <FinanceTools currency={model.currency} />}

      <Modal open={review !== null} onClose={() => setReview(null)} title={f.reviewTitle} closeLabel={t.common.close} size="lg">
        {review && (
          <div className="space-y-5 text-sm">
            <p className="leading-relaxed text-foreground">{review.verdict}</p>
            {(
              [
                [f.reviewObservations, review.observations],
                [f.reviewRisks, review.risks],
                [f.reviewAssumptions, review.questionableAssumptions],
                [f.reviewActions, review.nextActions],
              ] as const
            ).map(([title, items]) =>
              items.length ? (
                <div key={title}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground">
                    {items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
            <p className="text-xs text-muted-foreground">{f.reviewDisclaimer}</p>
            <div className="flex justify-end">
              <button type="button" className={primaryButtonClass} onClick={() => setReview(null)}>
                {t.common.done}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
