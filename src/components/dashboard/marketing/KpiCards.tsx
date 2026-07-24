"use client"

import { getDashboardData, type MarketingMetric } from "@/src/app/actions/dashboard"
import * as React from "react"

export function KpiCards() {
  const [metrics, setMetrics] = React.useState<MarketingMetric[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getDashboardData()
      .then((data) => setMetrics(data.overview?.marketing.kpis ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-48 animate-pulse rounded-2xl border border-border bg-muted/50" />
  if (!metrics.length) return <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">Marketing metrics will appear when this project has saved documents, tasks, or tracked campaign data.</div>

  return <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
    {metrics.map((metric) => <div key={metric.title} className="flex h-48 flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{metric.title}</span><span className={`rounded-md px-2 py-1 text-xs font-bold ${metric.color}`}>{metric.change}</span></div>
      <div><p className="text-4xl font-bold text-foreground">{metric.value}{metric.unit}</p><p className="mt-1 text-xs text-muted-foreground">Calculated from saved project records</p></div>
    </div>)}
  </div>
}
