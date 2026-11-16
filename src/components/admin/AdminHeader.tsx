"use client"

import { ThemeToggle } from "@/src/components/shared/ThemeToggle"
import { AdminUserContext } from "@/src/lib/admin-guard"
import { Menu, Shield } from "lucide-react"
import * as React from "react"
import { AdminMobileDrawer } from "@/src/components/admin/AdminSidebar"

export function AdminHeader({ adminContext }: { adminContext: AdminUserContext }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), [])

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 md:hidden"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
          <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          <span className="truncate">System Master Admin</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <ThemeToggle />
        
        <div className="flex items-center gap-2.5 pl-2 sm:pl-4 border-l border-zinc-200 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-green-700 text-white font-bold flex items-center justify-center text-xs shadow">
            {(adminContext.fullName || adminContext.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {adminContext.fullName || "Admin"}
            </div>
            <div className="text-[11px] text-zinc-500 truncate max-w-[150px]">
              {adminContext.email}
            </div>
          </div>
        </div>
      </div>
      <AdminMobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </header>
  )
}
