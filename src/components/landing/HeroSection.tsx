"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Calendar,
  AlertCircle,
  Lightbulb,
  ShieldCheck,
  ChevronRight,
  Zap,
  Globe2,
  Coins,
} from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-24 lg:pt-16 lg:pb-32">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-500/25 to-emerald-700/10 opacity-60 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Tagline & Trust Pill */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-500/[0.08] px-3.5 py-1.5 text-xs font-semibold tracking-wider uppercase text-emerald-800 backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold">Built for the next generation of African entrepreneurs</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-6 max-w-4xl text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08]">
            Your next big business idea deserves{" "}
            <span className="relative inline-block text-emerald-800 dark:text-emerald-400">
              more than just an idea.
              <svg
                className="absolute -bottom-1 left-0 -z-10 w-full text-emerald-400/30 dark:text-emerald-500/25"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 9C50 3 150 2 299 9"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          {/* Supporting Headline */}
          <p className="mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
            Meet Anza, your AI co-founder. From validating your idea to building,
            launching, and growing your business — everything starts here.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Link
              href="/sign-up"
              className="group inline-flex h-12 sm:h-13 w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-emerald-700 px-7 text-sm sm:text-base font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all duration-300 hover:bg-emerald-800 hover:shadow-xl hover:shadow-emerald-700/30 active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <span>Start Building for Free</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <a
              href="#product-showcase"
              className="inline-flex h-12 sm:h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white/70 px-6 text-sm sm:text-base font-semibold text-foreground backdrop-blur-sm transition-all duration-200 hover:bg-black/[0.04] hover:border-black/[0.15] dark:border-white/[0.1] dark:bg-zinc-900/60 dark:hover:bg-white/[0.06]"
            >
              <span>Explore Anza</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </a>
          </div>

          {/* Micro-trust indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Calibrated for 54 African economies</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Coins className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Multi-currency & Mobile Money native</span>
            </div>
          </div>
        </div>

        {/* HERO VISUAL: Faithful, high-fidelity Anza Product Showcase */}
        <div className="relative mt-12 sm:mt-16 lg:mt-20">
          {/* Subtle glow beneath the mockup frame */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-600/20 blur-xl opacity-75" />

          <div className="relative rounded-2xl sm:rounded-3xl border border-black/[0.08] bg-card p-3 sm:p-5 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#0f241d]/90">
            {/* Top Workspace Bar (Simulating actual Anza App top bar) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3 sm:pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm">
                  KP
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-foreground truncate">
                      KaziPay Logistics
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      MVP Stage
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Nairobi, Kenya · B2B Agribusiness Supply Chain · KES / USD
                  </p>
                </div>
              </div>

              {/* Status and quick metrics */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs">
                <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground font-medium">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>M-Pesa API Active</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50/70 px-3 py-1 font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Zap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>AI Co-Founder Synced</span>
                </div>
              </div>
            </div>

            {/* Main Interactive Grid representing Anza Dashboard */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Left Column: Business Health & Operational Progress */}
              <div className="flex flex-col gap-4">
                {/* Business Health Card */}
                <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Business Health Index
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">Overall Readiness Score</h4>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <TrendingUp className="size-3" /> Strong Momentum
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-5">
                    <div className="flex size-18 sm:size-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/40">
                      <span className="text-2xl sm:text-3xl font-extrabold text-foreground">84</span>
                      <span className="text-[10px] font-medium text-muted-foreground">/ 100</span>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-foreground">Market Viability (Kenya)</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">88%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: "88%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-foreground">Unit Economics & Margin</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">82%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: "82%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-foreground">Execution & Sprint Velocity</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">79%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: "79%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestone & Active Sprints */}
                <div className="rounded-xl sm:rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Upcoming Milestones
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      2 of 5 Complete
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-medium text-foreground line-through opacity-75">
                          Finalize cold-chain distributor interviews in Eldoret
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">Done</span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 px-3.5 py-2.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold text-foreground">
                          Test tiered subscription with 12 Westlands pilot retailers
                        </span>
                      </div>
                      <span className="rounded bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        In 3 days
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-muted-foreground">
                          Submit Tony Elumelu Foundation grant pitch deck
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">Next week</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Co-Founder Live Interaction & Recommendation */}
              <div className="flex flex-col gap-4">
                {/* Live Copilot Dialogue Card */}
                <div className="rounded-xl sm:rounded-2xl border border-emerald-500/25 bg-background/95 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/80">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
                          <Bot className="size-4" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-foreground">Anza Copilot</p>
                          <p className="text-[10px] text-muted-foreground">Context: East Africa Agribusiness</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="size-3" /> Live Guidance
                      </span>
                    </div>

                    {/* Chat Bubble: Founder Question */}
                    <div className="mt-3.5 flex items-start gap-2.5">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                        ME
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-xs text-foreground leading-relaxed">
                        How should we structure merchant pricing for informal retailers in Nairobi considering M-Pesa fees?
                      </div>
                    </div>

                    {/* Chat Bubble: AI Response */}
                    <div className="mt-3 flex items-start gap-2.5">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                        AZ
                      </div>
                      <div className="rounded-2xl rounded-tl-sm border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs text-foreground leading-relaxed">
                        <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                          Recommendation for Nairobi informal retailers:
                        </p>
                        <p className="mt-1 text-muted-foreground leading-normal">
                          Avoid charging per-transaction markups — retailers resist variable fee anxiety. Instead, package a flat weekly subscription of <strong>KES 850</strong> that absorbs standard Paybill fees. This yields a <strong>34% gross margin</strong> and projected <strong>28% faster merchant onboarding</strong>.
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-90 dark:bg-emerald-600"
                          >
                            <CheckCircle2 className="size-3" /> Apply to Financial Model
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted"
                          >
                            Update Canvas
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Priority banner */}
                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] p-3 text-xs flex items-center gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      <Lightbulb className="size-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Next Priority Action
                      </p>
                      <p className="font-medium text-foreground text-[11px]">
                        Review unit economics before committing hardware capital.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

