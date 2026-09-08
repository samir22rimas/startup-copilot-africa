"use client"

import { useState } from "react"
import { AdminUserListItem, UserPlanTier, updateUserPlanTierAction } from "@/src/app/actions/admin"
import { Search, Filter, Check, Loader2, Building2, MessageSquare, Download, Users } from "lucide-react"

export function UserManagementTable({ initialUsers }: { initialUsers: AdminUserListItem[] }) {
  const [users, setUsers] = useState<AdminUserListItem[]>(initialUsers)
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesTier = tierFilter === "all" || u.tier.toLowerCase() === tierFilter.toLowerCase()
    return matchesSearch && matchesTier
  })

  async function handlePlanChange(userId: string, newTier: UserPlanTier) {
    setUpdatingUserId(userId)
    setToastMessage(null)

    const res = await updateUserPlanTierAction(userId, newTier)

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tier: newTier } : u))
      )
      setToastMessage(`Updated user plan to ${newTier}`)
      setTimeout(() => setToastMessage(null), 3000)
    } else {
      alert(`Error updating plan: ${res.error}`)
    }

    setUpdatingUserId(null)
    setSelectedUser(null)
  }

  function handleExportCSV() {
    const headers = ["ID", "Name", "Email", "Tier", "City", "Country", "Startups Count", "Feedbacks Count", "Joined Date"]
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${u.fullName}"`,
      u.email,
      u.tier,
      `"${u.city || ""}"`,
      `"${u.countryCode || ""}"`,
      u.startupsCount,
      u.feedbacksCount,
      new Date(u.createdAt).toISOString()
    ])

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `anza_users_export_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="p-3 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <Check className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
            <Users className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">User Directory</h2>
            <p className="text-xs text-zinc-500">{filteredUsers.length} users found</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition-shadow"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400 hidden sm:block" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-600 transition-shadow"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free Tier</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
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

      {/* Users Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="max-h-[min(60dvh,42rem)] overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-4 px-5">User</th>
                <th className="py-4 px-5">Location</th>
                <th className="py-4 px-5">Plan</th>
                <th className="py-4 px-5 text-center">Startups</th>
                <th className="py-4 px-5 text-center">Feedback</th>
                <th className="py-4 px-5">Joined Date</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="text-zinc-500 text-sm font-medium">No users found</p>
                    <p className="text-zinc-400 text-xs mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-600/10 text-green-700 dark:text-green-400 font-bold flex items-center justify-center text-sm ring-1 ring-green-600/20 group-hover:ring-green-600/40 transition-all">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-[13px]">
                            {user.fullName}
                          </div>
                          <div className="text-zinc-500 text-[11px] mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-zinc-600 dark:text-zinc-300">
                      {user.city || user.countryCode ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{user.countryCode || "Unknown"}</span>
                          <span className="text-[10px] text-zinc-400 uppercase">{user.city || "No City"}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Not set</span>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      <span
                        className={`inline-block px-3 py-1 text-[11px] font-bold rounded-full border ${
                          user.tier === "Enterprise"
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                            : user.tier === "Pro"
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : user.tier === "Starter"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {user.tier}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-semibold bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                        {user.startupsCount}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-semibold bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                        {user.feedbacksCount}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-zinc-500 font-medium">
                      {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        disabled={updatingUserId === user.id}
                        className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-[11px] text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm"
                      >
                        {updatingUserId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                        ) : (
                          "Manage Plan"
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Tier Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Change Subscription Plan
              </h3>
              <p className="text-sm text-zinc-500 mt-1">
                Updating tier for <strong className="text-zinc-900 dark:text-zinc-100">{selectedUser.fullName}</strong>
              </p>
            </div>

            <div className="space-y-2.5">
              {(["Free", "Starter", "Pro", "Enterprise"] as UserPlanTier[]).map((tier) => (
                <button
                  key={tier}
                  onClick={() => handlePlanChange(selectedUser.id, tier)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-left text-sm font-semibold transition-all shadow-sm ${
                    selectedUser.tier === tier
                      ? "bg-green-500/10 border-green-600 text-green-700 dark:text-green-400 ring-1 ring-green-600"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedUser.tier === tier ? "border-green-600 bg-green-600" : "border-zinc-400"}`}>
                      {selectedUser.tier === tier && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span>{tier} Tier</span>
                  </div>
                  <span className="text-zinc-500 text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                    {tier === "Free" ? "$0" : tier === "Starter" ? "$19/mo" : tier === "Pro" ? "$49/mo" : "$199/mo"}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
