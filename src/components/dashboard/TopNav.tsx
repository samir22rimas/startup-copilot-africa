"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Bell, LogOut } from "lucide-react"
import { Input } from "@/src/components/ui/input"
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
  const [isSearchFocused, setIsSearchFocused] = React.useState(false)
  const [showNotifications, setShowNotifications] = React.useState(false)
  const [showProfileMenu, setShowProfileMenu] = React.useState(false)

  const initial = user?.initial || "U"

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-6 relative z-50">
      
      {/* Left section: Logo & Nav Links */}
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-green-700 dark:text-green-400 text-lg tracking-tight">
          <Image src="/logo.png" alt="Startup Copilot Africa" width={36} height={36} className="size-9 rounded-lg object-contain" />
          <span className="hidden lg:inline">Startup Copilot Africa</span>
        </Link>
        
        <nav aria-label="Dashboard navigation" className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 relative after:absolute after:bottom-[-22px] after:left-0 after:w-full after:h-[2px] after:bg-green-600">
            Dashboard
          </Link>
        </nav>
      </div>

      {/* Right section: Search, Icons, Profile */}
      <div className="flex items-center gap-4">
        
        {/* Search */}
        <div className={`relative hidden lg:block transition-all duration-300 ${isSearchFocused ? 'w-80' : 'w-64'}`}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`h-4 w-4 transition-colors ${isSearchFocused ? 'text-green-500' : 'text-zinc-400'}`} />
          </div>
          <Input 
            className="h-9 pl-9 bg-[#f3f6fc] dark:bg-zinc-900 border-transparent text-sm rounded-full transition-all focus-visible:ring-1 focus-visible:ring-green-500" 
            placeholder="Search campaign..." 
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-50 dark:hover:bg-zinc-800 rounded-full transition-all relative"
          >
            <Bell className="w-5 h-5" />
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-12 z-50 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-4">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-3">Notifications</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No notifications yet.</p>
              </div>
            </>
          )}
        </div>

        {/* Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label="Open profile menu"
            aria-expanded={showProfileMenu}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0 cursor-pointer hover:ring-2 hover:ring-green-500 hover:ring-offset-2 dark:hover:ring-offset-zinc-950 transition-all flex items-center justify-center bg-green-100 dark:bg-green-900/50"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name || "User Avatar"} className="size-full object-cover" />
            ) : (
              <span aria-hidden="true" className="text-xs font-bold text-green-800 dark:text-green-300">{initial}</span>
            )}
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-12 z-50 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden py-1">
                <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{user?.name || "User"}</p>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Edit Profile
                </Link>
                <form action={signOut}>
                  <button type="submit" className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign out
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
