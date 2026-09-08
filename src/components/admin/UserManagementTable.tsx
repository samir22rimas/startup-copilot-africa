"use client"

import { useState } from "react"
import { AdminUserListItem, UserPlanTier, updateUserPlanTierAction } from "@/src/app/actions/admin"
import { Search, Filter, ShieldAlert, Check, Loader2, Sparkles, Building2, MessageSquare } from "lucide-react"

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

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="p-3 rounded-lg bg-green-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <Check className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="all">All Subscription Tiers</option>
            <option value="free">Free Tier</option>
            <option value="starter">Starter ($19)</option>
            <option value="pro">Pro ($49)</option>
            <option value="enterprise">Enterprise ($199)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Subscription Plan</th>
                <th className="py-3.5 px-4 text-center">Startups</th>
                <th className="py-3.5 px-4 text-center">Feedbacks</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 italic">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-600/10 text-green-700 dark:text-green-400 font-bold flex items-center justify-center text-xs">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {user.fullName}
                          </div>
                          <div className="text-zinc-500 text-[11px]">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                      {user.city || user.countryCode ? (
                        <span>
                          {user.city ? `${user.city}, ` : ""}
                          {user.countryCode || ""}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">Not set</span>
                      )}
                    </td>

                    {/* Tier Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full border ${
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

                    {/* Startups */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300 font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                        {user.startupsCount}
                      </span>
                    </td>

                    {/* Feedbacks */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300 font-semibold">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                        {user.feedbacksCount}
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        disabled={updatingUserId === user.id}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-xs text-zinc-900 dark:text-zinc-100 transition-colors"
                      >
                        {updatingUserId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Manage Tier"
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
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Change Subscription Plan
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Updating tier for <strong className="text-zinc-900 dark:text-zinc-100">{selectedUser.fullName}</strong> ({selectedUser.email})
              </p>
            </div>

            <div className="space-y-2">
              {(["Free", "Starter", "Pro", "Enterprise"] as UserPlanTier[]).map((tier) => (
                <button
                  key={tier}
                  onClick={() => handlePlanChange(selectedUser.id, tier)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left text-xs font-semibold transition-colors ${
                    selectedUser.tier === tier
                      ? "bg-green-500/10 border-green-600 text-green-700 dark:text-green-400"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{tier} Tier</span>
                    {selectedUser.tier === tier && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                  <span className="text-zinc-500">
                    {tier === "Free" ? "$0" : tier === "Starter" ? "$19/mo" : tier === "Pro" ? "$49/mo" : "$199/mo"}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
