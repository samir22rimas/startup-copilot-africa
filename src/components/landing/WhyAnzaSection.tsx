"use client"

import * as React from "react"
import {
  Globe2,
  Coins,
  BrainCircuit,
  Milestone,
  Layers,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Check,
} from "lucide-react"

const differentiators = [
  {
    title: "Designed for African Market Realities",
    description:
      "Most software assumes high-bandwidth connections, credit card saturation, and formal distribution chains. Anza accounts for informal trade, WhatsApp commerce, last-mile logistics, and local trust patterns.",
    icon: Globe2,
    tag: "Context-First",
  },
  {
    title: "Native Multi-Currency & Mobile Money",
    description:
      "Model your revenues and costs in KES, NGN, ZAR, GHS, RWF, EGP, or USD. Anza understands Paybill numbers, USSD billing, transaction fees, and currency volatility out of the box.",
    icon: Coins,
    tag: "Financial Reality",
  },
  {
    title: "Contextual Business Recommendations",
    description:
      "Rather than generic motivational advice, Anza delivers actionable next steps tailored to your exact industry, African city, development phase, and available working capital.",
    icon: BrainCircuit,
    tag: "Precision Guidance",
  },
  {
    title: "Calibrated for Every Startup Stage",
    description:
      "Whether you are testing a rough idea on campus, launching your minimum viable product, or preparing for an institutional seed round, Anza evolves its guidance to match your scale.",
    icon: Milestone,
    tag: "Stage-Adaptive",
  },
  {
    title: "One Connected Entrepreneurial Workspace",
    description:
      "Replace scattered spreadsheets, disjointed Google Docs, and messy notes. Discovery, market research, business plans, financial models, and execution sprints stay unified in one dashboard.",
    icon: Layers,
    tag: "Zero Fragmentation",
  },
  {
    title: "Accessible 24/7 AI-Powered Co-Founder",
    description:
      "Great business mentors are scarce and expensive. Anza gives every ambitious builder an on-demand thinking partner that challenges assumptions, reviews numbers, and maintains momentum.",
    icon: Sparkles,
    tag: "Always Available",
  },
]

export function WhyAnzaSection() {
  return (
    <section id="why-anza" className="py-20 sm:py-28 bg-muted/20 border-t border-border/80 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Globe2 className="size-3.5" />
            The Anza Difference
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Built with African entrepreneurs in mind.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Building on the African continent is uniquely dynamic and rewarding. Your tools should
            reflect the economic landscapes, payment channels, and operational realities you live every day.
          </p>
        </div>

        {/* Distinctive Feature Grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {differentiators.map((diff) => {
            const Icon = diff.icon
            return (
              <div
                key={diff.title}
                className="group relative rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover:bg-emerald-700 group-hover:text-white transition-colors duration-300">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {diff.tag}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                  {diff.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {diff.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Bottom Local Currency & Geography Banner */}
        <div className="mt-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-xs">
              54
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">
                Supported African Economies & Major Regional Currencies
              </p>
              <p className="text-[11px] text-muted-foreground">
                KES (Kenya) · NGN (Nigeria) · ZAR (South Africa) · GHS (Ghana) · RWF (Rwanda) · EGP (Egypt) · USD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="size-4" />
            <span>Built by builders who understand the terrain</span>
          </div>
        </div>
      </div>
    </section>
  )
}

