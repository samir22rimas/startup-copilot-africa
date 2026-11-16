"use client"

import * as React from "react"
import Link from "next/link"
import { Check, ArrowRight, Sparkles, Clock, ShieldCheck } from "lucide-react"

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 sm:py-28 bg-muted/20 border-t border-border/80 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="size-3.5" />
            Simple & Transparent
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Start free today. Scale as you grow.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            During our early access period, every core feature is available free.
            Transparent, founder-friendly pricing tiers will be introduced for advanced growth capabilities.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-14 grid gap-8 lg:grid-cols-3 items-stretch">
          {/* Card 1: FREE / EARLY ACCESS (LIVE NOW) */}
          <div className="relative rounded-3xl border-2 border-emerald-600 bg-card p-7 sm:p-8 shadow-xl flex flex-col justify-between dark:border-emerald-500">
            {/* Active Pill */}
            <div className="absolute -top-3.5 left-8 inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm dark:bg-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Available Now · Free
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Early Access Founder</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Everything you need to validate & launch</p>
                </div>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-foreground">Free</span>
                <span className="text-xs text-muted-foreground">during early access</span>
              </div>

              <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                No credit card required. Immediate access upon signup.
              </p>

              {/* Feature List */}
              <div className="mt-7 space-y-3 border-t border-border/80 pt-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Included Features (Live):
                </p>
                <div className="flex items-start gap-2.5 text-xs text-foreground">
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Interactive AI Business Copilot</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-foreground">
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Idea Discovery & Structured Validation interviews</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-foreground">
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Dynamic Business Model Canvas builder</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-foreground">
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Multi-Currency financial & pricing calculators</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-foreground">
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Milestones & Weekly Focus task manager</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-foreground">
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Business Health score diagnostics</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/sign-up"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: PRO (PLANNED) */}
          <div className="relative rounded-3xl border border-border bg-card/70 p-7 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Pro Founder</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">For ventures scaling into revenue</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Planned
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">Coming Soon</span>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Affordable monthly subscription priced in local African currencies.
              </p>

              {/* Feature List */}
              <div className="mt-7 space-y-3 border-t border-border/80 pt-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Planned Growth Capabilities:
                </p>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Unlimited strategic AI Copilot inquiries</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Deep 30-page regional market research reports</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Exportable institutional business plans (.pdf & .docx)</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Full pitch deck generator with slide downloads</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Automatic grant & accelerator application drafting</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/sign-up"
                className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Join Early Access
              </Link>
            </div>
          </div>

          {/* Card 3: TEAM & HUBS (PLANNED) */}
          <div className="relative rounded-3xl border border-border bg-card/70 p-7 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Team & Incubators</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">For co-founders, hubs & cohorts</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Planned
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">Custom</span>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                For startup hubs, university incubators, and multi-member founder teams.
              </p>

              {/* Feature List */}
              <div className="mt-7 space-y-3 border-t border-border/80 pt-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Planned Institutional Capabilities:
                </p>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Multi-seat co-founder & team workspaces</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Advisor & mentor read/review permissions</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Portfolio cohort progress analytics</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Multi-venture management in one account</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="size-4 text-emerald-600/70 shrink-0 mt-0.5" />
                  <span>Dedicated onboarding and incubator workshops</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/sign-up"
                className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Contact for Pilot Hubs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
