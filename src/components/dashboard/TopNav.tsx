"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { LogOut } from "lucide-react"
import { signOut } from "@/src/app/actions/auth"
import { ThemeToggle } from "@/src/components/shared/ThemeToggle"

interface TopNavProps {
  user?: {
    avatarUrl?: string
    initial?: string
    name?: string
  }
}

export function TopNav({ user }: TopNavProps) {
  const [showProfileMenu, setShowProfileMenu] = React.useState(false)
  const initial = user?.initial || "U"

  return (
    <header className="relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-green-700 dark:text-green-400"
        >
          <Image
            src="/logo.png"
            alt="Startup Copilot Africa"
            width={36}
            height={36}
            className="size-9 rounded-lg object-contain"
          />
          <span className="hidden lg:inline">Startup Copilot Africa</span>
        </Link>

        <nav aria-label="Dashboard navigation" className="hidden items-center gap-6 md:flex">
          <Link
            href="/dashboard"
            className="relative text-sm font-semibold text-zinc-900 after:absolute after:bottom-[-22px] after:left-0 after:h-[2px] after:w-full after:bg-green-600 dark:text-zinc-50"
          >
            Dashboard
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="relative">
          <button
            type="button"
            aria-label="Open profile menu"
            aria-expanded={showProfileMenu}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-green-100 transition-all hover:ring-2 hover:ring-green-500 hover:ring-offset-2 dark:border-zinc-800 dark:bg-green-900/50 dark:hover:ring-offset-zinc-950"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name || "User Avatar"} className="size-full object-cover" />
            ) : (
              <span aria-hidden="true" className="text-xs font-bold text-green-800 dark:text-green-300">
                {initial}
              </span>
            )}
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                    {user?.name || "User"}
                  </p>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Edit Profile
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
