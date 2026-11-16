"use client"

import * as React from "react"
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  Layers,
  ArrowRight,
  Compass,
  FileSpreadsheet,
  Split,
  Sparkles,
  Zap,
} from "lucide-react"

const challenges = [
  {
    problem: "Unclear business ideas",
    problemDesc: "Founders begin with broad concepts but lack the structured tools to stress-test customer problems, target segments, and real willingness-to-pay.",
    solution: "Structured Discovery & Assumption Testing",
    solutionDesc: "Step-by-step AI guided interviews that distill fuzzy ideas into actionable, testable business hypotheses.",
  },
  {
    problem: "Limited market knowledge",
    problemDesc: "Generic Silicon Valley frameworks ignore local informal economies, purchasing power, mobile payments, and regulatory nuances across Africa.",
    solution: "African Market Intelligence",
    solutionDesc: "Deep contextual research tailored to 54 African countries, local competitor dynamics, and consumer behaviors.",
  },
  {
    problem: "Difficult financial planning",
    problemDesc: "Spreadsheets are intimidating. Modeling break-even, cash runway, and pricing across local currencies (KES, NGN, ZAR, GHS) feels out of reach.",
    solution: "Automated Financial Intelligence",
    solutionDesc: "Founder-friendly financial models that calculate unit economics, pricing margins, and startup burn rates automatically.",
  },
  {
    problem: "Disorganized execution",
    problemDesc: "Without an experienced co-founder, founders freeze in decision paralysis, working on low-impact tasks instead of core growth milestones.",
    solution: "Sequential Milestones & Weekly Focus",
    solutionDesc: "Prioritized sprints that translate your strategic vision into clear daily tasks and tracked milestones.",
  },
  {
    problem: "Lack of strategic guidance",
    problemDesc: "Venture advisors and seasoned co-founders are scarce and expensive. Early founders are left to make costly mistakes alone in the dark.",
    solution: "24/7 AI Co-Founder Copilot",
    solutionDesc: "An intelligent, always-available partner that knows your startup's context and helps you make sharper decisions.",
  },
  {
    problem: "Fragmented tools",
    problemDesc: "Juggling disjointed notes, spreadsheets, pitch decks, chat apps, and task lists causes momentum to leak at every step.",
    solution: "One Connected Operating System",
    solutionDesc: "A single unified workspace connecting discovery, business planning, financial modeling, and execution.",
  },
]

export function ProblemOpportunitySection() {
  return (
    <section className="relative py-20 sm:py-28 border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Compass className="size-3.5" />
            The Founder Journey
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Building a business shouldn&apos;t mean figuring everything out alone.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            African entrepreneurs are among the most resilient in the world. But starting up
            often means navigating fragmented advice, blind spots, and isolated decisions.
            Anza bridges the gap between raw ambition and disciplined execution.
          </p>
        </div>

        {/* Unified Comparison Matrix (Elegant 2-Column Split rather than generic cards) */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm">
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* Left Header */}
            <div className="p-6 sm:p-8 bg-red-500/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <TrendingDown className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                    The Solo Struggle
                  </h3>
                  <p className="text-xs text-muted-foreground">What slows founders down</p>
                </div>
              </div>
            </div>

            {/* Right Header */}
            <div className="p-6 sm:p-8 bg-emerald-500/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    The Anza Advantage
                  </h3>
                  <p className="text-xs text-muted-foreground">One intelligent, unified co-founder</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {challenges.map((item, index) => (
              <div
                key={item.problem}
                className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border group transition-colors hover:bg-muted/15"
              >
                {/* Problem Cell */}
                <div className="p-5 sm:p-7 flex items-start gap-4">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold mt-0.5">
                    ×
                  </span>
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-foreground">
                      {item.problem}
                    </h4>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {item.problemDesc}
                    </p>
                  </div>
                </div>

                {/* Solution Cell */}
                <div className="p-5 sm:p-7 flex items-start gap-4 bg-emerald-500/[0.01]">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold mt-0.5">
                    ✓
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-semibold text-emerald-900 dark:text-emerald-300">
                        {item.solution}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-foreground/80 leading-relaxed">
                      {item.solutionDesc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Summary Bar */}
          <div className="border-t border-border bg-emerald-950 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Layers className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Anza transforms uncertainty into a repeatable system.</p>
                <p className="text-xs text-emerald-200/75">
                  Stop second-guessing your next step. Build with structure from day one.
                </p>
              </div>
            </div>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 whitespace-nowrap"
            >
              <span>See how the workflow connects</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

