"use client"

import * as React from "react"
import {
  Bot,
  Lightbulb,
  Search,
  FileText,
  Wallet,
  KanbanSquare,
  Compass,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="size-3.5" />
            Complete Operating System
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything you need to turn ambition into action.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Eight interconnected engines that accompany you from day zero through growth,
            calibrated for the unique opportunities and challenges of African markets.
          </p>
        </div>

        {/* Feature 1 & 7: The Strategic Intelligence Core (Alternating Row 1) */}
        <div className="mt-16 sm:mt-24 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Bot className="size-4" /> Feature 01 & 07
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              AI Business Copilot & Real-Time Business Intelligence
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Your 24/7 co-founder that doesn&apos;t just generate generic text. It analyzes your entire business state, evaluates trade-offs, detects operational blind spots, and provides continuous 100-point health tracking.
            </p>
            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Context-Aware Advice:</strong> Copilot remembers your revenue model, city, customer feedback, and runway.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Quantified Health Index:</strong> Dynamic scores across Market Viability, Financial Runway, and Execution Velocity.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Proactive Prompts:</strong> Receive targeted recommendations on what to prioritize next each week.</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-lg">
              {/* Mockup Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-700 text-white">
                    <Bot className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Strategic Co-Founder Advisory</p>
                    <p className="text-[10px] text-muted-foreground">Active Session: Unit Economics Stress Test</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  Health 84/100
                </span>
              </div>

              {/* Mockup Body */}
              <div className="mt-4 space-y-3 text-xs">
                <div className="rounded-xl bg-muted/40 p-3.5 border border-border/60">
                  <p className="text-muted-foreground font-medium">Founder Query:</p>
                  <p className="text-foreground mt-1 font-semibold">
                    &quot;Our customer acquisition cost (CAC) in Lagos is ₦4,500. Can we sustain this with our current subscription pricing?&quot;
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
                    <Sparkles className="size-3.5" />
                    <span>Copilot Diagnosis & Modeling</span>
                  </div>
                  <p className="text-foreground/90 leading-relaxed">
                    At ₦4,500 CAC and your current monthly price of ₦6,000 with a 3-month average retention, your LTV is ₦18,000 (LTV:CAC ratio = 4.0x).
                    <strong> This is healthy</strong>, but your payback period is 28 days.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-background p-2 border border-border">
                      <p className="text-[10px] text-muted-foreground">LTV / CAC</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">4.0x</p>
                    </div>
                    <div className="rounded-lg bg-background p-2 border border-border">
                      <p className="text-[10px] text-muted-foreground">Payback Time</p>
                      <p className="text-sm font-bold text-foreground">28 Days</p>
                    </div>
                    <div className="rounded-lg bg-background p-2 border border-border">
                      <p className="text-[10px] text-muted-foreground">Gross Margin</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">68%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 & 3: Idea Discovery & Market Research (Alternating Row 2) */}
        <div className="mt-20 sm:mt-28 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-lg">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Search className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-foreground">African Market Opportunity Matrix</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">Region: West Africa · Sector: FinTech</span>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border bg-background p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Informal Sector Reach</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">High Potential</span>
                  </div>
                  <p className="text-muted-foreground leading-normal">
                    68% of targeted merchants transact via WhatsApp and USSD rather than web browsers.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Competitor Density</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">Moderate (3 rivals)</span>
                  </div>
                  <p className="text-muted-foreground leading-normal">
                    Competitors charge heavy setup fees; zero upfront fee represents a clear wedge.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Payment Infrastructure</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Verified</span>
                  </div>
                  <p className="text-muted-foreground leading-normal">
                    Integrated support for Paystack, Flutterwave, and Bank Transfer APIs.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Validation Gate</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Passed (18/20)</span>
                  </div>
                  <p className="text-muted-foreground leading-normal">
                    18 of 20 surveyed merchants confirmed willingness to trial within 14 days.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-muted/40 p-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Hypothesis Confidence Score:</span>
                <span className="font-bold text-foreground">89% Statistical Confidence</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Lightbulb className="size-4" /> Feature 02 & 03
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Idea Discovery, Validation & Market Research
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Never build in the dark. Anza guides you through structured customer interviews, assumption stress-testing, and rigorous market validation before you spend scarce capital.
            </p>
            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Assumption Testing:</strong> Identify your riskiest unvalidated assumptions and generate survey questions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Competitor Benchmarking:</strong> Analyze local incumbent strengths, pricing, and structural gaps.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Target Persona Modeling:</strong> Build precise customer profiles reflecting African consumer behavior.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature 4 & 5: Business Planning & Financial Intelligence (Alternating Row 3) */}
        <div className="mt-20 sm:mt-28 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Wallet className="size-4" /> Feature 04 & 05
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Institutional Business Plans & Financial Intelligence
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Generate structured, investor-ready business plans and live financial models. Effortlessly calculate break-even, operating expenses, and cash runways in local African currencies.
            </p>
            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Business Model Canvas:</strong> Real-time 9-box canvas synced directly with your financial forecasts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>African Currency Awareness:</strong> Model in KES, NGN, ZAR, GHS, RWF, EGP, or USD with inflation safeguards.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Investor Deck Exports:</strong> Download polished plans in PDF, DOCX, and presentation formats.</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-lg">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-foreground">Live Financial Engine & Projections</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono">
                  <span>Currency:</span>
                  <span className="font-bold text-foreground">KES (Kenyan Shilling)</span>
                </div>
              </div>

              {/* Financial Metric Cards */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Monthly Burn</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">KES 145,000</p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Controlled</span>
                </div>

                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Break-Even Units</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">172 Clients</p>
                  <span className="text-[10px] text-muted-foreground font-medium">@ KES 850/mo</span>
                </div>

                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Estimated Runway</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">11.4 Months</p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Healthy</span>
                </div>

                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Target Margin</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">34.2%</p>
                  <span className="text-[10px] text-muted-foreground font-medium">Net Operating</span>
                </div>
              </div>

              {/* Mini Business Plan Section Preview */}
              <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1.5">
                  <span>Executive Plan Section: Revenue & Distribution</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">Investor Ready</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  &quot;The business implements a low-friction subscription collection model leveraging localized Paybill rails, eliminating manual reconciliation overhead and securing recurring working capital...&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 6 & 8: Execution Management & African Opportunities (Alternating Row 4) */}
        <div className="mt-20 sm:mt-28 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-lg">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Compass className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-foreground">Matched African Grants & Accelerator Programs</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                  3 Matched Grants
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white font-bold text-xs">
                      TEF
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Tony Elumelu Foundation Grant</p>
                      <p className="text-[10px] text-muted-foreground">$5,000 non-dilutive seed capital · Africa-wide</p>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-100 dark:bg-emerald-950 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    96% Fit Match
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white font-bold text-xs">
                      MEST
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">MEST Africa Incubation & Venture Fund</p>
                      <p className="text-[10px] text-muted-foreground">Pre-seed equity & hands-on mentoring · Accra / Lagos / Nairobi</p>
                    </div>
                  </div>
                  <span className="rounded bg-blue-100 dark:bg-blue-950 px-2 py-1 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                    91% Fit Match
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-700 text-white font-bold text-xs">
                      AECF
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Africa Enterprise Challenge Fund (AECF)</p>
                      <p className="text-[10px] text-muted-foreground">Agribusiness & Renewable Energy Innovation Challenge</p>
                    </div>
                  </div>
                  <span className="rounded bg-amber-100 dark:bg-amber-950 px-2 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                    88% Fit Match
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <KanbanSquare className="size-4" /> Feature 06 & 08
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Execution Management & African Opportunities
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Ideas are cheap; disciplined execution wins. Anza turns broad strategies into actionable sprints, while continuously matching your venture with real-world African grants, incubators, and investors.
            </p>
            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Milestone Sprints:</strong> Organize weekly deliverables, assign team owners, and prevent project drift.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Opportunity Radar:</strong> Filter hundreds of regional grants and challenges by country, stage, and sector.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Application Auto-Drafter:</strong> Repurpose your validated business brief into grant applications in minutes.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

