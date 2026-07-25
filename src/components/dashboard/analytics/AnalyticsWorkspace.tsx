"use client"

import type { AnalyticsWorkspace as AnalyticsWorkspaceData } from "@/src/app/actions/analytics"
import { generateAnalyticsWorkspace, saveTrackedMetrics } from "@/src/app/actions/analytics"
import {
  PROVENANCE_HINT,
  hasTrackedMetrics,
  type TrackedMetrics,
  emptyTrackedMetrics,
} from "@/src/lib/data-truth"
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Lightbulb,
  RefreshCw,
  CheckCircle,
  Smartphone,
  PencilLine,
  Save,
} from "lucide-react"
import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

interface AnalyticsWorkspaceProps {
  projectId: string
  startup: { name?: string; city?: string | null; budget_currency?: string | null }
  initialWorkspace: AnalyticsWorkspaceData | null
  initialTracked: TrackedMetrics
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.length === 3 ? currency : "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function AnalyticsWorkspace({
  projectId,
  startup,
  initialWorkspace,
  initialTracked,
}: AnalyticsWorkspaceProps) {
  const router = useRouter()
  const currency = startup.budget_currency || initialTracked.currency || "USD"

  const [workspace, setWorkspace] = React.useState<AnalyticsWorkspaceData | null>(initialWorkspace)
  const [tracked, setTracked] = React.useState<TrackedMetrics>(
    initialTracked.updatedAt ? initialTracked : emptyTrackedMetrics(currency),
  )
  const [draft, setDraft] = React.useState({
    monthlyRevenue: String(initialTracked.monthlyRevenue || ""),
    activeCustomers: String(initialTracked.activeCustomers || ""),
    monthlyBurn: String(initialTracked.monthlyBurn || ""),
    visitorsThisMonth: String(initialTracked.visitorsThisMonth || ""),
    notes: initialTracked.notes || "",
    currency: initialTracked.currency || currency,
  })
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState("")
  const [saveMessage, setSaveMessage] = React.useState("")

  async function handleGenerate() {
    setIsGenerating(true)
    setError("")
    try {
      const res = await generateAnalyticsWorkspace(projectId)
      if (res.success) {
        setWorkspace(res.workspace)
        router.refresh()
      } else setError(res.error)
    } catch (err) {
      console.error("Failed to generate analytics workspace", err)
      setError("Could not generate projection. Try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveTracked(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setSaveMessage("")
    setError("")
    try {
      const res = await saveTrackedMetrics(projectId, {
        monthlyRevenue: Number(draft.monthlyRevenue) || 0,
        activeCustomers: Number(draft.activeCustomers) || 0,
        monthlyBurn: Number(draft.monthlyBurn) || 0,
        visitorsThisMonth: Number(draft.visitorsThisMonth) || 0,
        currency: draft.currency || currency,
        notes: draft.notes || undefined,
      })
      if (res.success) {
        setTracked(res.metrics)
        setSaveMessage("Tracked metrics saved.")
        router.refresh()
      } else setError(res.error)
    } catch (err) {
      console.error(err)
      setError("Could not save tracked metrics.")
    } finally {
      setIsSaving(false)
    }
  }

  const trackedReady = hasTrackedMetrics(tracked)

  return (
    <div className="space-y-8 pb-12 font-sans">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-700">
            Analytics — {startup.name}
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
            Tracked numbers &amp; projections
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Log what is actually happening, then optionally generate an AI scenario. Projections are never shown as live data.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={`size-4 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating…" : "Generate AI projection"}
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Tracked metrics — source of truth */}
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <PencilLine className="size-5 text-green-700" />
              <h2 className="font-bold text-zinc-900 dark:text-white">Your tracked metrics</h2>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                Tracked
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{PROVENANCE_HINT.tracked}</p>
          </div>
          {tracked.updatedAt && (
            <p className="text-[11px] text-zinc-400">
              Last updated {new Date(tracked.updatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {trackedReady && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TrackedStat label="Monthly revenue" value={formatMoney(tracked.monthlyRevenue, tracked.currency)} />
            <TrackedStat label="Active customers" value={String(tracked.activeCustomers)} />
            <TrackedStat label="Monthly burn" value={formatMoney(tracked.monthlyBurn, tracked.currency)} />
            <TrackedStat label="Visitors this month" value={String(tracked.visitorsThisMonth)} />
          </div>
        )}

        <form onSubmit={handleSaveTracked} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Monthly revenue"
            value={draft.monthlyRevenue}
            onChange={(v) => setDraft((d) => ({ ...d, monthlyRevenue: v }))}
            placeholder="0"
          />
          <Field
            label="Active customers"
            value={draft.activeCustomers}
            onChange={(v) => setDraft((d) => ({ ...d, activeCustomers: v }))}
            placeholder="0"
          />
          <Field
            label="Monthly burn"
            value={draft.monthlyBurn}
            onChange={(v) => setDraft((d) => ({ ...d, monthlyBurn: v }))}
            placeholder="0"
          />
          <Field
            label="Visitors this month"
            value={draft.visitorsThisMonth}
            onChange={(v) => setDraft((d) => ({ ...d, visitorsThisMonth: v }))}
            placeholder="0"
          />
          <Field
            label="Currency"
            value={draft.currency}
            onChange={(v) => setDraft((d) => ({ ...d, currency: v.toUpperCase() }))}
            placeholder="USD"
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Notes (optional)</label>
            <input
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="e.g. MoMo + Paystack only"
            />
          </div>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              <Save className="size-4" />
              {isSaving ? "Saving…" : "Save tracked metrics"}
            </button>
            {saveMessage && <p className="text-sm text-emerald-600">{saveMessage}</p>}
          </div>
        </form>
      </section>

      {/* AI projection */}
      {!workspace ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <BarChart3 className="h-8 w-8 text-green-700" />
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white">No AI projection yet</h2>
            <p className="mt-2 max-w-lg text-sm text-zinc-500">
              {PROVENANCE_HINT.projected} Save tracked metrics first for a grounded scenario, then generate.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <RefreshCw className={`size-4 ${isGenerating ? "animate-spin" : ""}`} />
              Generate AI projection
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              AI projection
            </span>
            <p className="text-xs text-zinc-500">
              {PROVENANCE_HINT.projected}
              {workspace.generatedAt
                ? ` Generated ${new Date(workspace.generatedAt).toLocaleString()}.`
                : ""}
            </p>
          </div>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workspace.kpis.map((kpi, idx) => {
              let Icon = BarChart3
              if (idx === 0) Icon = DollarSign
              if (idx === 1) Icon = Users
              if (idx === 2) Icon = Smartphone
              if (idx === 3) Icon = TrendingUp

              return (
                <div
                  key={kpi.title}
                  className="rounded-2xl border border-amber-200/60 bg-white p-6 shadow-sm dark:border-amber-900/30 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{kpi.title}</span>
                    <div className={`rounded-lg p-2 ${kpi.color}`}>
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">{kpi.value}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span
                        className={
                          kpi.trend === "up"
                            ? "font-semibold text-emerald-600"
                            : kpi.trend === "down"
                              ? "font-semibold text-amber-600"
                              : "text-zinc-500"
                        }
                      >
                        {kpi.change.split(" ")[0]}
                      </span>
                      <span>{kpi.change.split(" ").slice(1).join(" ")}</span>
                    </p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80">
                      Scenario · not live
                    </p>
                  </div>
                </div>
              )
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
              <div className="mb-4">
                <h3 className="font-bold text-zinc-900 dark:text-white">Projected growth trajectory</h3>
                <p className="text-xs text-zinc-500">Six-month scenario of visitors, active users, and revenue.</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={workspace.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#15803d" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-100 dark:stroke-zinc-800/80" />
                    <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "12px",
                        border: "1px solid #e4e4e7",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      name="Projected revenue"
                      type="monotone"
                      dataKey="revenueUSD"
                      stroke="#15803d"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      name="Projected active users"
                      type="monotone"
                      dataKey="activeUsers"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">Projected payment mix</h3>
                <p className="text-xs text-zinc-500">Scenario split across local payment networks.</p>
              </div>
              <div className="my-6 space-y-5">
                {workspace.channels.map((channel, idx) => {
                  const colors = ["bg-emerald-600", "bg-blue-600", "bg-zinc-400"]
                  const textColors = ["text-emerald-600", "text-blue-600", "text-zinc-500"]
                  const lightColors = [
                    "bg-emerald-50 dark:bg-emerald-950/20",
                    "bg-blue-50 dark:bg-blue-950/20",
                    "bg-zinc-100 dark:bg-zinc-800",
                  ]
                  return (
                    <div key={channel.name} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{channel.name}</span>
                        <span className={`font-bold ${textColors[idx]}`}>{channel.percentage}%</span>
                      </div>
                      <div className={`h-3 w-full rounded-full ${lightColors[idx]}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colors[idx]}`}
                          style={{ width: `${channel.percentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Scenario value:{" "}
                        {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(channel.amountCents / 100)}{" "}
                        {currency}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-6">
                <h3 className="font-bold text-zinc-900 dark:text-white">Projected conversion funnel</h3>
                <p className="text-xs text-zinc-500">Scenario journey from discovery to paying customer.</p>
              </div>
              <div className="space-y-4">
                {workspace.funnel.map((step, idx) => {
                  const widthClass =
                    idx === 0 ? "w-full" : idx === 1 ? "w-[85%]" : idx === 2 ? "w-[70%]" : "w-[55%]"
                  const bgGradient =
                    idx === 0
                      ? "from-green-700 to-green-600 text-white"
                      : idx === 1
                        ? "from-green-600/90 to-green-500/90 text-white"
                        : idx === 2
                          ? "from-emerald-500/80 to-emerald-400/80 text-emerald-950 dark:text-emerald-50"
                          : "from-teal-400/75 to-teal-300/75 text-teal-950 dark:text-teal-50"

                  return (
                    <div key={step.stage} className="flex items-center gap-4">
                      <div className="w-32 shrink-0 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {step.stage.split(" / ")[0]}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`flex items-center justify-between rounded-xl bg-gradient-to-r p-3 text-xs font-medium shadow-sm ${widthClass} ${bgGradient}`}
                        >
                          <span className="truncate">{step.stage}</span>
                          <span className="font-bold">{new Intl.NumberFormat("en-US").format(step.count)}</span>
                        </div>
                      </div>
                      <div className="w-16 shrink-0 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {idx === 0 ? "Baseline" : `${step.conversionRate}%`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Lightbulb className="size-5 text-green-700" />
                  <h3 className="font-bold text-zinc-900 dark:text-white">AI recommendations</h3>
                </div>
                <div className="space-y-4">
                  {workspace.recommendations.map((rec) => (
                    <div
                      key={rec.title}
                      className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/60"
                    >
                      <h4 className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                        <CheckCircle className="size-3.5 shrink-0 text-green-700" />
                        {rec.title}
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{rec.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function TrackedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-300/70">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
      />
    </div>
  )
}
