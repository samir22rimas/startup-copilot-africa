"use client"

import * as React from "react"
import { useMarketing } from "./MarketingContext"

export function KpiCards() {
  const { kpis } = useMarketing()

  if (!kpis.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Derived marketing metrics appear once this project has tasks or saved documents.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {kpis.map((metric) => (
        <div
          key={metric.title}
          className="flex h-48 flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {metric.title}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Derived
              </span>
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${metric.color}`}>{metric.change}</span>
            </div>
          </div>
          <div>
            <p className="text-4xl font-bold text-foreground">
              {metric.value}
              {metric.unit}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.footnote}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
