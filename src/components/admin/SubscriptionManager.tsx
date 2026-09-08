"use client"

import { useState } from "react"
import { AdminSubscriptionItem, UserPlanTier, updateUserPlanTierAction } from "@/src/app/actions/admin"
import { CreditCard, DollarSign, Users, Check, Filter, Search, ArrowUpRight } from "lucide-react"

export function SubscriptionManager({
  initialSubscriptions,
  initialStats,
}: {
  initialSubscriptions: AdminSubscriptionItem[]
  initialStats: {
    mrr: number
    activeCount: number
    tierCounts: Record<UserPlanTier, number>
  }
}) {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>(initialSubscriptions)
  const [stats, setStats] = useState(initialStats)
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState("all")

  const filtered = subscriptions.filter((s) => {
    const matchesSearch =
      s.userName.toLowerCase().includes(search.toLowerCase()) ||
      s.userEmail.toLowerCase().includes(search.toLowerCase())
    const matchesTier = tierFilter === "all" || s.tier.toLowerCase() === tierFilter.toLowerCase()
    return matchesSearch && matchesTier
  })

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* MRR */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Monthly Recurring Revenue (MRR)
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              ${stats.mrr}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              USD / month
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Calculated from active plan subscriptions</p>
        </div>

        {/* Paid Subscribers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Active Paid Accounts
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {stats.activeCount}
            </span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Paid Users
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Starter, Pro, & Enterprise accounts</p>
        </div>

        {/* Average Revenue Per User */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            ARPU (Avg Rev Per Paid User)
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              ${stats.activeCount > 0 ? (stats.mrr / stats.activeCount).toFixed(2) : "0.00"}
            </span>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              USD
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Monthly average per customer</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search subscriptions by subscriber name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="all">All Plans</option>
            <option value="free">Free ($0)</option>
            <option value="starter">Starter ($19)</option>
            <option value="pro">Pro ($49)</option>
            <option value="enterprise">Enterprise ($199)</option>
          </select>
        </div>
      </div>

      {/* Subscription Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Subscriber</th>
                <th className="py-3.5 px-4">Plan Tier</th>
                <th className="py-3.5 px-4">Billing Status</th>
                <th className="py-3.5 px-4">Monthly Value</th>
                <th className="py-3.5 px-4">Start Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500 italic">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr key={sub.userId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {sub.userName}
                      </div>
                      <div className="text-zinc-500 text-[11px]">{sub.userEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {sub.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full border ${
                          sub.status === "active"
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 border-zinc-300"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                      ${sub.monthlyAmountUsd} / mo
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
