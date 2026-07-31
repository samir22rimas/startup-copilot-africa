"use client"

import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { ThemeToggle } from "@/src/components/shared/ThemeToggle"
import * as React from "react"

export function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        <ThemeToggle />
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-10 items-center justify-center rounded-lg border border-white/20 text-white transition-all hover:bg-white/10"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          {/* Menu panel */}
          <nav
            aria-label="Mobile navigation"
            className="absolute left-0 right-0 top-20 z-50 border-t border-white/10 bg-[#082b22] px-6 py-6 shadow-2xl md:hidden"
          >
            <div className="flex flex-col gap-5">
              <a
                href="#how-it-works"
                onClick={() => setOpen(false)}
                className="text-base font-medium text-green-50/80 transition-colors hover:text-white"
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={() => setOpen(false)}
                className="text-base font-medium text-green-50/80 transition-colors hover:text-white"
              >
                Features
              </a>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="text-base font-medium text-green-50/80 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-green-400 px-6 font-semibold text-[#063126] transition-all hover:bg-green-300"
              >
                Get started — it&apos;s free
              </Link>
            </div>
          </nav>
        </>
      )}
    </>
  )
}
