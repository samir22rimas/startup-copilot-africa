"use client"

import { useState } from "react"
import { AdminFeedbackItem } from "@/src/app/actions/admin"
import { MessageSquare, Star, Filter, Search, CheckCircle2, Clock, Globe } from "lucide-react"

export function FeedbackManagementList({ initialFeedback }: { initialFeedback: AdminFeedbackItem[] }) {
  const [items, setItems] = useState<AdminFeedbackItem[]>(initialFeedback)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedItem, setSelectedItem] = useState<AdminFeedbackItem | null>(null)

  const filtered = items.filter((f) => {
    const matchesSearch =
      f.message.toLowerCase().includes(search.toLowerCase()) ||
      f.userName.toLowerCase().includes(search.toLowerCase()) ||
      f.userEmail.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || f.category.toLowerCase() === categoryFilter.toLowerCase()
    return matchesSearch && matchesCategory
  })

  function toggleStatus(id: string, newStatus: AdminFeedbackItem["status"]) {
    setItems((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
    )
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem({ ...selectedItem, status: newStatus })
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search feedback by content, user, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="all">All Categories</option>
            <option value="bug">Bugs</option>
            <option value="feature">Features</option>
            <option value="improvement">Improvements</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Grid of Feedbacks */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No feedback items match your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                        item.category === "bug"
                          ? "bg-red-500/10 text-red-600 border-red-500/20"
                          : item.category === "feature"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : item.category === "improvement"
                          ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {item.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                        item.status === "resolved"
                          ? "bg-green-500/10 text-green-600"
                          : item.status === "in_review"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                    {item.rating ? (
                      <>
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{item.rating}/5</span>
                      </>
                    ) : (
                      <span className="text-zinc-400 text-[10px]">No rating</span>
                    )}
                  </div>
                </div>

                {/* Message */}
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal whitespace-pre-wrap">
                  "{item.message}"
                </p>

                {item.pageUrl && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <Globe className="w-3 h-3" />
                    <span className="truncate">{item.pageUrl}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.userName}
                  </div>
                  <div className="text-[10px] text-zinc-400">{item.userEmail}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleStatus(item.id, item.status === "resolved" ? "open" : "resolved")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      item.status === "resolved"
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {item.status === "resolved" ? "Re-open" : "Mark Resolved"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
