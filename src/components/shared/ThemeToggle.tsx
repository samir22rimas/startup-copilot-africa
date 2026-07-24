"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )

  if (!mounted) {
    return (
      <div className={`size-9 rounded-full border border-border bg-muted animate-pulse ${className}`} />
    )
  }

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      title={`Current theme: ${theme}. Click to switch.`}
      className={`size-9 flex items-center justify-center rounded-full border border-border bg-muted text-muted-foreground shadow-sm transition-all duration-300 hover:scale-105 hover:bg-accent hover:text-accent-foreground active:scale-95 cursor-pointer ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-500 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-500 hover:-rotate-12" />
      )}
    </button>
  )
}
