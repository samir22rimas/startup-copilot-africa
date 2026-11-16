"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { compactNumber, formatMoney } from "@/src/lib/finance/currency"
import type { MonthProjection } from "@/src/lib/finance/model"

/**
 * Projected cash balance by month: one series, one axis, a zero line so the
 * moment cash runs out is visible. The full figures are in the table below it.
 */
export function CashChart({
  months,
  currency,
  locale,
  label,
  monthLabel,
}: {
  months: MonthProjection[]
  currency: string
  locale: string
  label: string
  monthLabel: (month: number) => string
}) {
  return (
    <div className="h-64 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={months} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => compactNumber(value, locale)}
          />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as MonthProjection | undefined) : undefined
              if (!point) return null
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-foreground">{monthLabel(point.month)}</p>
                  <p className="tabular mt-0.5 text-muted-foreground">
                    {label}: <span className="font-semibold text-foreground">{formatMoney(point.cash, currency, locale)}</span>
                  </p>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="cash"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
