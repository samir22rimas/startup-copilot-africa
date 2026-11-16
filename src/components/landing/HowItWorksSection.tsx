"use client"

import * as React from "react"
import {
  Lightbulb,
  Search,
  Wrench,
  Rocket,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

const steps = [
  {
    step: "01",
    phase: "Discover",
    title: "Start with your idea, skills or opportunity",
    description:
      "Share your ambition, background, and observed problem in your city. Anza shapes rough thoughts into a crisp, focused entrepreneurial brief without corporate jargon.",
    deliverables: [
      "Guided problem statement interview",
      "Initial feasibility rating",
      "Target customer hypothesis",
    ],
    icon: Lightbulb,
  },
  {
    step: "02",
    phase: "Validate",
    title: "Understand your customers, market and potential",
    description:
      "Stress-test your assumptions before putting money on the line. Anza generates interview questions, assesses competitive landscape, and identifies customer willingness-to-pay.",
    deliverables: [
      "Assumption testing matrix",
      "African competitor benchmark",
      "Customer interview synthesizer",
    ],
    icon: Search,
  },
  {
    step: "03",
    phase: "Build",
    title: "Develop your business model, plan and finances",
    description:
      "Construct a living Business Model Canvas and a comprehensive business plan. Model cashflows, break-even targets, and localized pricing in KES, NGN, ZAR, GHS, or USD.",
    deliverables: [
      "Dynamic 9-box Canvas",
      "Localized unit economics calculator",
      "Exportable executive pitch deck",
    ],
    icon: Wrench,
  },
  {
    step: "04",
    phase: "Execute",
    title: "Organize your work, track progress and grow",
    description:
      "Turn your plan into weekly sprints and measurable milestones. Track your 100-point business health index and discover matched African grants and accelerators.",
    deliverables: [
      "Sequenced weekly focus sprints",
      "Real-time business health score",
      "Curated African grant matches",
    ],
    icon: Rocket,
  },
]

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = React.useState(0)

  return (
    <section id="how-it-works" className="py-20 sm:py-28 border-y border-border/80 bg-muted/30 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="size-3.5" />
            Proven Methodology
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            From your first idea to your next milestone.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            A guided four-stage entrepreneurial journey that removes the mystery of starting a business.
            Move from concept to customer with total clarity.
          </p>
        </div>

        {/* Connected Journey Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
          {/* Subtle horizontal connecting line for desktop */}
          <div className="hidden lg:block absolute top-12 left-10 right-10 h-0.5 bg-gradient-to-r from-emerald-500/20 via-emerald-600/40 to-emerald-500/20 -z-0" />

          {steps.map((item, index) => {
            const Icon = item.icon
            const isActive = activeStep === index
            return (
              <div
                key={item.step}
                onClick={() => setActiveStep(index)}
                className={`group relative z-10 rounded-2xl border p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "border-emerald-600 bg-card shadow-xl shadow-emerald-950/[0.05] ring-2 ring-emerald-500/20 dark:border-emerald-500"
                    : "border-border/80 bg-card/60 hover:border-emerald-500/40 hover:bg-card"
                }`}
              >
                <div>
                  {/* Step Number & Icon badge */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-950/10 group-hover:scale-105 transition-transform dark:bg-emerald-600">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                      PHASE {item.step}
                    </span>
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {item.phase}
                  </span>
                  <h3 className="mt-1 text-base sm:text-lg font-bold text-foreground group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Deliverables Checklist */}
                <div className="mt-6 border-t border-border/60 pt-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    You get:
                  </p>
                  {item.deliverables.map((d) => (
                    <div key={d} className="flex items-center gap-2 text-xs text-foreground/85">
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Dynamic Detail Card of currently selected step */}
        <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white font-extrabold text-base">
              {steps[activeStep].step}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Stage Focus: {steps[activeStep].phase}
              </p>
              <h4 className="text-sm sm:text-base font-bold text-foreground">
                {steps[activeStep].title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Step {activeStep + 1} of 4 in the Anza OS
            </span>
            <a
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <span>Begin Phase 01 Free</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

