"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/src/lib/utils"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  Building2,
  Activity,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react"

const adminNavItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "Users & Profiles", href: "/admin/users" },
  { icon: CreditCard, label: "Subscriptions", href: "/admin/subscriptions" },
  { icon: MessageSquare, label: "User Feedback", href: "/admin/feedback" },
  { icon: Building2, label: "Startups", href: "/admin/startups" },
  { icon: Activity, label: "Logs & Usage", href: "/admin/logs" },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-full md:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-white flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center font-bold text-white shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-zinc-100 leading-tight">Anza Admin</h1>
            <p className="text-[11px] text-zinc-400 font-medium">Control Center</p>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-green-500/20 text-green-400 border border-green-500/30">
          Admin
        </span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Management
        </div>

        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Switch back to User Portal */}
      <div className="p-3 border-t border-zinc-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-green-400" />
          <span>Return to App</span>
        </Link>
      </div>
    </aside>
  )
}
