import Link from "next/link"
import { getAdminOverviewStats } from "@/src/app/actions/admin"
import {
  Users,
  Building2,
  FolderKanban,
  MessageSquare,
  CreditCard,
  TrendingUp,
  Activity,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react"

export default async function AdminOverviewPage() {
  const res = await getAdminOverviewStats()

  if (!res.success) {
    return (
      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
        <h2 className="font-bold text-lg">Error loading Admin Dashboard</h2>
        <p className="text-sm mt-1">{res.error}</p>
      </div>
    )
  }

  const {
    totalUsers,
    totalStartups,
    totalProjects,
    totalFeedbacks,
    totalUsageEvents,
    mrrEstimateCents,
    planDistribution,
    recentUsers,
    recentFeedback,
  } = res.data

  const formattedMrr = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(mrrEstimateCents / 100)

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Platform Overview
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Real-time metrics on users, startups, subscriptions, feedback, and system activity.
        </p>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Total Registered Users
            </span>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {totalUsers}
            </span>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Full profile accounts</p>
        </div>

        {/* Total Startups & Projects */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Startups & Projects
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {totalStartups}
            </span>
            <span className="text-xs text-zinc-500">
              ({totalProjects} projects)
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Created across all accounts</p>
        </div>

        {/* Estimated MRR */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Est. Monthly Revenue (MRR)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {formattedMrr}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              / mo
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">From active subscription tiers</p>
        </div>

        {/* Total Feedback */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Feedback Received
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {totalFeedbacks}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              Submissions
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{totalUsageEvents} total usage events logged</p>
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-green-600" /> Subscription Plan Breakdown
          </h2>
          <Link
            href="/admin/subscriptions"
            className="text-xs text-green-600 dark:text-green-400 font-semibold hover:underline flex items-center gap-1"
          >
            Manage Subscriptions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
            <span className="text-xs text-zinc-500 font-medium uppercase">Free Tier</span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {planDistribution.Free}
            </div>
            <span className="text-[11px] text-zinc-400">$0 / mo</span>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-center">
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">
              Starter Plan
            </span>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {planDistribution.Starter}
            </div>
            <span className="text-[11px] text-blue-500">$19 / mo</span>
          </div>

          <div className="p-4 rounded-xl bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 text-center">
            <span className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase">
              Pro Plan
            </span>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
              {planDistribution.Pro}
            </div>
            <span className="text-[11px] text-green-500">$49 / mo</span>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 text-center">
            <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase">
              Enterprise Plan
            </span>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
              {planDistribution.Enterprise}
            </div>
            <span className="text-[11px] text-purple-500">$199 / mo</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Users & Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" /> Recent User Signups
            </h2>
            <Link
              href="/admin/users"
              className="text-xs text-green-600 dark:text-green-400 font-semibold hover:underline flex items-center gap-1"
            >
              View All Users <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentUsers.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-4">No users signed up yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {recentUsers.map((user) => (
                <div key={user.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-zinc-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {user.tier}
                    </span>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Feedback */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" /> Recent Feedback
            </h2>
            <Link
              href="/admin/feedback"
              className="text-xs text-green-600 dark:text-green-400 font-semibold hover:underline flex items-center gap-1"
            >
              View Inbox <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentFeedback.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-4">No feedback submitted yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {recentFeedback.map((fb) => (
                <div key={fb.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {fb.userName} ({fb.userEmail})
                    </span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {fb.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    "{fb.message}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Rating: {fb.rating ? "★".repeat(fb.rating) : "N/A"}</span>
                    <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
