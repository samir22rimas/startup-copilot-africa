"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

const baseMetrics = [
  {
    title: "TOTAL IMPRESSIONS",
    value: 842.6,
    unit: "K",
    change: "+12.5%",
    trend: "up",
    icon: (
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: "bg-green-100 text-green-700",
  },
  {
    title: "AVERAGE CTR",
    value: 3.82,
    unit: "%",
    change: "4.2%",
    trend: "up",
    icon: (
      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "CONVERSION RATE",
    value: 1.24,
    unit: "%",
    change: "-0.4%",
    trend: "down",
    icon: (
      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: "bg-red-100 text-red-700",
  }
]

export function KpiCards() {
  const [range, setRange] = React.useState("This Week")
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  
  // Randomize slightly based on range to simulate data fetching
  const multiplier = range === "This Week" ? 1 : range === "This Month" ? 4.2 : 12.5

  return (
    <div className="space-y-4">
      
      <div className="flex justify-end">
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            {range} <ChevronDown className="w-3 h-3" />
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-32 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden py-1">
                {["This Week", "This Month", "This Year"].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRange(r)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 ${range === r ? 'text-green-700 dark:text-green-400' : 'text-zinc-700 dark:text-zinc-300'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {baseMetrics.map((metric, i) => {
          const displayValue = (metric.value * multiplier).toFixed(metric.unit === "K" ? 1 : 2)
          return (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between h-48 transition-all">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.trend === 'up' && i===0 ? 'bg-green-50' : i===1 ? 'bg-blue-50' : 'bg-red-50'}`}>
                  {metric.icon}
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-md ${metric.color}`}>
                  {metric.change}
                </div>
              </div>
              
              <div className="mt-8 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {metric.title}
                </div>
                <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                  {displayValue}{metric.unit}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

