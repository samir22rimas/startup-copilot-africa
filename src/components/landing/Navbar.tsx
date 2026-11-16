"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X, ArrowRight, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/src/components/shared/ThemeToggle"
import { cn } from "@/src/lib/utils"

const navLinks = [
  { label: "Product", href: "#product-showcase" },
  { label: "Solutions", href: "#who-is-anza-for" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Resources", href: "#faq" },
]

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [mobileMenuOpen])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-black/[0.06] bg-white/85 shadow-sm shadow-emerald-950/[0.02] backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0c1f19]/85"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Identity */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="Anza Home"
        >
          <div className="relative flex size-9 sm:size-10 items-center justify-center overflow-hidden rounded-xl bg-emerald-950 p-1 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-500/20">
            <Image
              src="/logo.png"
              alt="Anza Logo"
              width={40}
              height={40}
              priority
              className="size-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                <span className="text-emerald-600 dark:text-emerald-400">A</span>nza
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-600/15 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-300 uppercase">
                <Sparkles className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                AI Co-Founder
              </span>
            </div>
            <span className="hidden md:block text-[10px] text-muted-foreground font-medium">
              For African Entrepreneurs
            </span>
          </div>
        </Link>

        {/* Center: Desktop Nav */}
        <nav
          className="hidden md:flex items-center gap-1 rounded-full border border-black/[0.06] bg-white/70 px-3 py-1 shadow-sm shadow-black/[0.02] backdrop-blur-md dark:border-white/[0.08] dark:bg-zinc-900/60"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:text-emerald-600 hover:bg-emerald-50/60 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle className="size-8 sm:size-9" />

          <Link
            href="/sign-in"
            className="hidden sm:inline-flex h-9 sm:h-10 items-center justify-center rounded-xl px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-foreground/80 transition-colors hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            Log in
          </Link>

          <Link
            href="/sign-up"
            className="group inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-emerald-700 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-emerald-950/20 transition-all duration-200 hover:bg-emerald-800 hover:shadow-md hover:shadow-emerald-700/25 active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <span>Get Started</span>
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden size-9 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-2 p-6 overflow-y-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1">
              Navigation
            </span>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3.5 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>{link.label}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </a>
            ))}

            <div className="my-3 border-t border-border pt-4 flex flex-col gap-2.5">
              <Link
                href="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Log in to your account
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <span>Get Started — Free</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                Building in Africa?
              </p>
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                Anza provides localized financial calculators, market validation, and AI co-founder guidance tailored to African markets.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

