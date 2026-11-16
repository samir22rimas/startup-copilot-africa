"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
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
  Cpu,
  Compass,
  ToggleRight,
  ScrollText,
  X,
} from "lucide-react"

const adminNavItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "Users & Profiles", href: "/admin/users" },
  { icon: CreditCard, label: "Subscriptions", href: "/admin/subscriptions" },
  { icon: MessageSquare, label: "User Feedback", href: "/admin/feedback" },
  { icon: Building2, label: "Startups", href: "/admin/startups" },
  { icon: Compass, label: "Opportunities", href: "/admin/opportunities" },
  { icon: Cpu, label: "AI Usage", href: "/admin/ai-usage" },
  { icon: ToggleRight, label: "Features & Plans", href: "/admin/features" },
  { icon: Activity, label: "Usage Events", href: "/admin/logs" },
  { icon: ScrollText, label: "Audit Trail", href: "/admin/audit" },
]

/** Desktop sidebar; on small screens the same content lives in <AdminMobileDrawer />. */
export function AdminSidebar() {
  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-900 text-white dark:border-zinc-800 md:flex">
      <AdminNavContent />
    </aside>
  )
}

export function AdminMobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        className="absolute inset-y-0 left-0 flex w-[min(18rem,86vw)] flex-col bg-zinc-900 text-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-2 top-3 z-10 flex size-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="size-4" />
        </button>
        <AdminNavContent onNavigate={onClose} />
      </div>
    </div>
  )
}

function AdminNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Brand Header */}
      <div className="p-4 pr-12 md:pr-4 border-b border-zinc-800 flex items-center justify-between gap-2">
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
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
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
              onClick={onNavigate}
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
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-green-400" />
          <span>Return to App</span>
        </Link>
      </div>
    </>
  )
}
