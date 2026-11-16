"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Globe2, Sparkles, ArrowUpRight } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/80 bg-card text-foreground transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Info (Spans 2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Anza Home">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-950 p-1 shadow-sm ring-1 ring-emerald-500/20">
                <Image
                  src="/logo.png"
                  alt="Anza Logo"
                  width={36}
                  height={36}
                  className="size-full object-contain"
                />
              </div>
              <span className="font-sans text-xl font-bold tracking-tight text-foreground">
                <span className="text-emerald-600 dark:text-emerald-400">A</span>nza
              </span>
            </Link>

            <p className="max-w-sm text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Your AI Co-Founder for Building Businesses in Africa. Transform raw ideas into structured, validated, and growing ventures with complete market intelligence.
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium pt-2">
              <span className="flex size-2 rounded-full bg-emerald-500" />
              <span>Calibrated for 54 African economies & currencies</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  AI Business Copilot
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Idea Validation
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Market Research
                </a>
              </li>
              <li>
                <a href="#product-showcase" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Business Model Canvas
                </a>
              </li>
              <li>
                <a href="#product-showcase" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Financial Planning
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  African Opportunities
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Solutions & Audiences */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Solutions
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#who-is-anza-for" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  University Students
                </a>
              </li>
              <li>
                <a href="#who-is-anza-for" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  First-Time Founders
                </a>
              </li>
              <li>
                <a href="#who-is-anza-for" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Growing Startups
                </a>
              </li>
              <li>
                <a href="#who-is-anza-for" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Small Business Owners
                </a>
              </li>
              <li>
                <a href="#who-is-anza-for" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Incubators & Hubs
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Platform & Legal
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#how-it-works" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Pricing Preview
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 border-t border-border/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} Anza Technologies. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <Globe2 className="size-3.5" />
              Built with ambition for African builders
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

