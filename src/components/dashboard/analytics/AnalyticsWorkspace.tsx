"use client"

import type { AnalyticsWorkspace as AnalyticsWorkspaceData } from "@/src/app/actions/analytics"
import { generateAnalyticsWorkspace } from "@/src/app/actions/analytics"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CreditCard, 
  Lightbulb, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle,
  Smartphone
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
  BarChart, 
  Bar, 
  Cell
} from "recharts"

interface AnalyticsWorkspaceProps {
  projectId: string
  startup: any
  initialWorkspace: AnalyticsWorkspaceData | null
}

export function AnalyticsWorkspace({ projectId, startup, initialWorkspace }: AnalyticsWorkspaceProps) {
  const router = useRouter()
  const [workspace, setWorkspace] = React.useState<AnalyticsWorkspaceData | null>(initialWorkspace?.source === "tracked" ? initialWorkspace : null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [error, setError] = React.useState("")

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
    } finally {
      setIsGenerating(false)
    }
  }

  if (!workspace) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4 text-center">
        <BarChart3 className="h-8 w-8 text-green-700" />
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">Analytics needs real event data</h2>
          <p className="mt-2 max-w-lg text-sm text-zinc-500">No figures are shown until acquisition, customer, revenue, and payment events are connected or imported for this project.</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button onClick={handleGenerate} disabled={isGenerating} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-60"><RefreshCw className={`size-4 ${isGenerating ? "animate-spin" : ""}`} /> Check connection</button>
        </div>
      </div>
    )
  }

  const currency = startup.budget_currency || "USD"

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-700">Performance Analytics &mdash; {startup.name}</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
            Acquisition & Payment Metrics
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Real-time conversion funnel and mobile payment channel analysis in <span className="font-semibold text-green-800 dark:text-green-400">{startup.city || "your city"}</span>.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${isGenerating ? "animate-spin" : ""}`} /> 
          {isGenerating ? "Syncing..." : "Sync Analytics"}
        </button>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {workspace.kpis.map((kpi, idx) => {
          // Map index to relevant icon
          let Icon = BarChart3
          if (idx === 0) Icon = DollarSign
          if (idx === 1) Icon = Users
          if (idx === 2) Icon = Smartphone
          if (idx === 3) Icon = TrendingUp

          return (
            <div 
              key={kpi.title} 
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{kpi.title}</span>
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">{kpi.value}</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <span className={kpi.trend === "up" ? "text-emerald-600 font-semibold" : kpi.trend === "down" ? "text-amber-600 font-semibold" : "text-zinc-500"}>
                    {kpi.change.split(" ")[0]}
                  </span>
                  <span>{kpi.change.split(" ").slice(1).join(" ")}</span>
                </p>
              </div>
            </div>
          )
        })}
      </section>

      {/* Charts Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Main Growth Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-bold text-zinc-900 dark:text-white">Growth Trajectory</h3>
            <p className="text-xs text-zinc-500">Overview of visitors, active users, and revenue evolution.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={workspace.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803d" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
                    fontSize: "12px"
                  }}
                  itemStyle={{ padding: "2px 0" }}
                />
                <Area name="Revenue (USD)" type="monotone" dataKey="revenueUSD" stroke="#15803d" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area name="Active Users" type="monotone" dataKey="activeUsers" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Localized Payments Share */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">Payment Channel Split</h3>
            <p className="text-xs text-zinc-500">Transactions processed by local payment networks.</p>
          </div>
          <div className="space-y-5 my-6">
            {workspace.channels.map((channel, idx) => {
              const colors = ["bg-emerald-600", "bg-blue-600", "bg-zinc-400"]
              const textColors = ["text-emerald-600", "text-blue-600", "text-zinc-500"]
              const lightColors = ["bg-emerald-50 dark:bg-emerald-950/20", "bg-blue-50 dark:bg-blue-950/20", "bg-zinc-100 dark:bg-zinc-800"]

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
                    Est. Value: {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format((channel.amountCents / 100))} {currency}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-[11px] leading-relaxed text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 flex gap-2">
            <Smartphone className="size-4 shrink-0 text-emerald-600" />
            <span>Mobile Money integration is essential to capture target segment convenience expectations.</span>
          </div>
        </div>
      </section>

      {/* Funnel & AI Recommendations */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Conversion Funnel */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md">
          <div className="mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-white">Active Conversion Funnel</h3>
            <p className="text-xs text-zinc-500">Customer journey flow from initial discovery to paying customer status.</p>
          </div>
          <div className="space-y-4">
            {workspace.funnel.map((step, idx) => {
              // Funnel visual blocks get progressively narrower
              const widthClass = idx === 0 ? "w-full" : idx === 1 ? "w-[85%]" : idx === 2 ? "w-[70%]" : "w-[55%]"
              const bgGradient = idx === 0 
                ? "from-green-700 to-green-600 text-white" 
                : idx === 1 
                ? "from-green-600/90 to-green-500/90 text-white" 
                : idx === 2 
                ? "from-emerald-500/80 to-emerald-400/80 text-emerald-950 dark:text-emerald-50" 
                : "from-teal-400/75 to-teal-300/75 text-teal-950 dark:text-teal-50"

              return (
                <div key={step.stage} className="flex items-center gap-4">
                  <div className="w-32 shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                    {step.stage.split(" / ")[0]}
                  </div>
                  <div className="flex-1">
                    <div className={`rounded-xl bg-gradient-to-r p-3 shadow-sm flex items-center justify-between text-xs font-medium transition-all duration-500 hover:scale-[1.01] ${widthClass} ${bgGradient}`}>
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

        {/* AI Recommendations */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="size-5 text-green-700 animate-pulse" />
              <h3 className="font-bold text-zinc-900 dark:text-white">AI Advisor Recommendations</h3>
            </div>
            <div className="space-y-4">
              {workspace.recommendations.map((rec) => (
                <div key={rec.title} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle className="size-3.5 text-green-700 shrink-0" />
                    {rec.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {rec.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
