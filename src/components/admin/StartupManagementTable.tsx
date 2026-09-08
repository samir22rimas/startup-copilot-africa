"use client"

import { useState } from "react"
import { AdminStartupListItem } from "@/src/app/actions/admin"
import { Search, Filter, Building2, Globe, DollarSign, Calendar } from "lucide-react"

export function StartupManagementTable({ initialStartups }: { initialStartups: AdminStartupListItem[] }) {
  const [startups, setStartups] = useState<AdminStartupListItem[]>(initialStartups)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState("all")

  const filtered = startups.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
      (s.industry && s.industry.toLowerCase().includes(search.toLowerCase()))
    const matchesStage = stageFilter === "all" || s.stage.toLowerCase() === stageFilter.toLowerCase()
    return matchesSearch && matchesStage
  })

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search startups by name, owner, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="all">All Growth Stages</option>
            <option value="idea">Idea</option>
            <option value="validation">Validation</option>
            <option value="mvp">MVP</option>
            <option value="early_revenue">Early Revenue</option>
            <option value="growth">Growth</option>
            <option value="scale">Scale</option>
          </select>
        </div>
      </div>

      {/* Startups Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Startup Name</th>
                <th className="py-3.5 px-4">Owner Profile</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Stage & Industry</th>
                <th className="py-3.5 px-4">Onboarding</th>
                <th className="py-3.5 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 italic">
                    No startups found matching your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((startup) => (
                  <tr key={startup.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-green-600" />
                        {startup.name}
                      </div>
                      <div className="text-[11px] text-zinc-400">/{startup.slug}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {startup.ownerName}
                      </div>
                      <div className="text-zinc-500 text-[11px]">{startup.ownerEmail}</div>
                    </td>

                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                      {startup.city ? `${startup.city}, ` : ""}
                      {startup.countryCode}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                        {startup.stage.replace("_", " ")}
                      </span>
                      <div className="text-[11px] text-zinc-400 mt-1">
                        {startup.industry || "General"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded ${
                          startup.onboardingStatus === "completed"
                            ? "bg-green-500/10 text-green-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {startup.onboardingStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                      {new Date(startup.createdAt).toLocaleDateString()}
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
