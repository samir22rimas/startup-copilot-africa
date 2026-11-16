"use client"

import { LogOut, Menu, Settings } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"

import { signOut } from "@/src/app/actions/auth"
import { MobileSidebar, type SidebarProps } from "@/src/components/dashboard/Sidebar"
import { LocaleSwitcher } from "@/src/components/shared/LocaleSwitcher"
import { ThemeToggle } from "@/src/components/shared/ThemeToggle"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"

interface TopNavProps {
  user?: {
    avatarUrl?: string
    initial?: string
    name?: string
    email?: string
  }
  plan?: { tier: string; used: number; limit: number } | null
  /** Navigation data for the mobile drawer. */
  sidebar?: SidebarProps
}

export function TopNav({ user, plan, sidebar }: TopNavProps) {
  const { t } = useI18n()
  const [showProfileMenu, setShowProfileMenu] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), [])
  const initial = user?.initial || "U"

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {sidebar && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t.nav.openMenu}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>
        )}
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <Image src="/logo.png" alt="" width={28} height={28} className="size-7 rounded-md object-contain" />
          <span>Anza</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />

        <div className="relative">
          <button
            type="button"
            aria-label={t.nav.profileMenu}
            aria-expanded={showProfileMenu}
            onClick={() => setShowProfileMenu((value) => !value)}
            className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent transition hover:ring-2 hover:ring-ring/40"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <span aria-hidden="true" className="text-xs font-semibold text-accent-foreground">
                {initial}
              </span>
            )}
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
                <div className="border-b border-border px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-foreground">{user?.name || "User"}</p>
                  {user?.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                </div>
                {plan && (
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="text-xs font-medium text-foreground">{fmt(t.nav.plan_label, { plan: plan.tier })}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.round((plan.used / Math.max(1, plan.limit)) * 100))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {fmt(t.nav.aiUsage, { used: plan.used, limit: plan.limit })}
                    </p>
                  </div>
                )}
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition hover:bg-muted"
                >
                  <Settings className="size-4 text-muted-foreground" /> {t.nav.editProfile}
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="size-4" /> {t.nav.signOut}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {sidebar && <MobileSidebar {...sidebar} open={drawerOpen} onClose={closeDrawer} />}
    </header>
  )
}
