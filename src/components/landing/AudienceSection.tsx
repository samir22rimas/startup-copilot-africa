"use client"

import * as React from "react"
import {
  GraduationCap,
  Rocket,
  TrendingUp,
  Store,
  Users2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"

const audiences = [
  {
    role: "Students with Startup Ideas",
    badge: "Idea Phase",
    icon: GraduationCap,
    benefit: "Turn campus innovation and thesis research into structured commercial ventures.",
    features: [
      "No business background needed",
      "Step-by-step idea feasibility scoring",
      "Generate student grant and pitch applications",
    ],
  },
  {
    role: "First-Time Founders",
    badge: "Zero to One",
    icon: Rocket,
    benefit: "Gain the clarity and guidance of a seasoned co-founder right by your side.",
    features: [
      "Guided problem and customer validation",
      "Avoid common early operational blind spots",
      "Create your first investor-ready business plan",
    ],
  },
  {
    role: "Growing Startups",
    badge: "Scale & Traction",
    icon: TrendingUp,
    benefit: "Maintain execution discipline, measure business health, and model runway.",
    features: [
      "Live 100-point business health diagnostics",
      "Multi-currency financial runway tracking",
      "Prepare institutional data room documents",
    ],
  },
  {
    role: "Small Business Owners & SMEs",
    badge: "Sustainable Growth",
    icon: Store,
    benefit: "Modernize retail, agri-processing, or service operations with smart financial tools.",
    features: [
      "Automated break-even and pricing calculators",
      "Weekly prioritized action checklists",
      "Mobile money and cashflow management",
    ],
  },
  {
    role: "Entrepreneurial Teams & Hubs",
    badge: "Collaborative",
    icon: Users2,
    benefit: "Align co-founders, advisors, and mentors around a single strategic source of truth.",
    features: [
      "Shared milestone and sprint roadmaps",
      "Exportable stakeholder progress updates",
      "Centralized strategy and document vault",
    ],
  },
]

export function AudienceSection() {
  return (
    <section id="who-is-anza-for" className="py-20 sm:py-28 bg-background relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Users2 className="size-3.5" />
            Designed For You
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Tailored for builders across every stage.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Whether you are testing your very first concept or scaling an established venture,
            Anza provides the structure, tools, and intelligence to advance your business.
          </p>
        </div>

        {/* Audience Cards Grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((item, idx) => {
            const Icon = item.icon
            const isWide = idx === 4 // Span 2 on large screens or centered
            return (
              <div
                key={item.role}
                className={`group rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-emerald-500/40 hover:shadow-md flex flex-col justify-between ${
                  isWide ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm dark:bg-emerald-600">
                      <Icon className="size-5" />
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                    {item.role}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.benefit}
                  </p>
                </div>

                <div className="mt-6 border-t border-border/60 pt-4 space-y-2">
                  {item.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

