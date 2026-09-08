"use client"

import { useState } from "react"
import { AdminStartupListItem } from "@/src/app/actions/admin"
import { Search, Filter, Building2, Download, Building } from "lucide-react"

export function StartupManagementTable({ initialStartups }: { initialStartups: AdminStartupListItem[] }) {
  const [startups] = useState<AdminStartupListItem[]>(initialStartups)
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

  function handleExportCSV() {
    const headers = ["Startup Name", "Slug", "Owner Name", "Owner Email", "Location", "Stage", "Industry", "Onboarding Status", "Created Date"]
    const rows = filtered.map((s) => [
      `"${s.name}"`,
      s.slug,
      `"${s.ownerName}"`,
      s.ownerEmail,
      `"${s.city ? s.city + ", " : ""}${s.countryCode}"`,
      s.stage,
      `"${s.industry || ""}"`,
      s.onboardingStatus,
      new Date(s.createdAt).toISOString()
    ])

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `anza_startups_export_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
            <Building className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Startups Directory</h2>
            <p className="text-xs text-zinc-500">{filtered.length} startups found</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search startups or owners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition-shadow"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400 hidden sm:block" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-600 transition-shadow"
            >
              <option value="all">All Stages</option>
              <option value="idea">Idea</option>
              <option value="validation">Validation</option>
              <option value="mvp">MVP</option>
              <option value="early_revenue">Early Revenue</option>
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Startups Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="max-h-[min(60dvh,42rem)] overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-4 px-5">Startup Details</th>
                <th className="py-4 px-5">Owner Profile</th>
                <th className="py-4 px-5">Location</th>
                <th className="py-4 px-5">Stage & Industry</th>
                <th className="py-4 px-5 text-center">Onboarding</th>
                <th className="py-4 px-5 text-right">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="text-zinc-500 text-sm font-medium">No startups found</p>
                    <p className="text-zinc-400 text-xs mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((startup) => (
                  <tr key={startup.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-[13px]">
                          <Building2 className="w-4 h-4 text-green-600" />
                          {startup.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded w-fit inline-block">
                          /{startup.slug}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-[13px]">
                        {startup.ownerName}
                      </div>
                      <div className="text-zinc-500 text-[11px] mt-0.5">{startup.ownerEmail}</div>
                    </td>

                    <td className="py-4 px-5 text-zinc-600 dark:text-zinc-300">
                      <div className="flex flex-col">
                        <span className="font-medium">{startup.countryCode || "Unknown"}</span>
                        <span className="text-[10px] text-zinc-400 uppercase">{startup.city || "No City"}</span>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          {startup.stage.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {startup.industry || "General"}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${
                          startup.onboardingStatus === "completed"
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {startup.onboardingStatus}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-zinc-500 font-medium text-right">
                      {new Date(startup.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
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
