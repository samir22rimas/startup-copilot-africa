"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Bot,
  FileText,
  Wallet,
  KanbanSquare,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  Share2,
  Coins,
  Check,
  Search,
} from "lucide-react"

type TabKey = "dashboard" | "copilot" | "plan" | "finance" | "projects"

interface TabOption {
  id: TabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const tabs: TabOption[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "copilot", label: "AI Copilot", icon: Bot, badge: "Live AI" },
  { id: "plan", label: "Business Plan", icon: FileText },
  { id: "finance", label: "Financial Planning", icon: Wallet },
  { id: "projects", label: "Execution & Tasks", icon: KanbanSquare },
]

export function ProductShowcaseSection() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("dashboard")

  return (
    <section id="product-showcase" className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Layers className="size-3.5" />
            Product Walkthrough
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Inside the Anza Workspace.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Experience how Anza unifies every corner of building a startup — from financial modeling
            and business plans to sprint execution and AI advisory.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="mt-10 sm:mt-12 flex justify-center">
          <div className="inline-flex max-w-full overflow-x-auto rounded-2xl border border-border bg-muted/40 p-1.5 shadow-sm scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border text-emerald-800 dark:text-emerald-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="hidden sm:inline-block rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dynamic Interactive Preview Canvas */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-4 sm:p-7 shadow-xl">
          {/* Top Window Chrome Bar */}
          <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-400/80" />
              <span className="size-3 rounded-full bg-amber-400/80" />
              <span className="size-3 rounded-full bg-emerald-400/80" />
              <span className="ml-2 font-mono text-[11px] text-muted-foreground hidden sm:inline">
                https://anza.app/dashboard/{activeTab === "dashboard" ? "" : activeTab}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                Live Prototype Preview
              </span>
            </div>
          </div>

          {/* TAB 1: DASHBOARD PREVIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      MVP Stage
                    </span>
                    <span>Accra, Ghana · B2B Renewable Cold Storage</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1">SolarChill Logistics</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    Currency: GHS / USD
                  </span>
                  <span className="rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm dark:bg-emerald-600">
                    Health: 86 / 100
                  </span>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Market Readiness</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-foreground">92%</span>
                    <span className="text-xs text-emerald-600 font-bold">Validated</span>
                  </div>
                  <p className="text-xs text-muted-foreground">14 anchor farmer cooperatives signed up for pilot phase.</p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Runway & Burn</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-foreground">9.2 Mo</span>
                    <span className="text-xs text-emerald-600 font-bold">Safe</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Monthly burn rate: GHS 18,500. Next capital injection expected Q3.</p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Sprint Velocity</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-foreground">4/5 Tasks</span>
                    <span className="text-xs text-emerald-600 font-bold">80% on track</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Active milestone: Delivery of 2 mobile cooler prototypes.</p>
                </div>
              </div>

              {/* Tailored recommendations list */}
              <div className="rounded-2xl border border-border bg-background p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Anza Strategic Action Queue
                  </h4>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Priority Sorted
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        1
                      </span>
                      <span className="font-semibold text-foreground">
                        Validate battery replacement cost assumptions with Chinese suppliers
                      </span>
                    </div>
                    <span className="text-muted-foreground">High Impact</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        2
                      </span>
                      <span className="font-semibold text-foreground">
                        Integrate MTN Mobile Money collection flow for automated billing
                      </span>
                    </div>
                    <span className="text-muted-foreground">Operational</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI COPILOT PREVIEW */}
          {activeTab === "copilot" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="size-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Anza Co-Founder Chat</p>
                      <p className="text-[10px] text-muted-foreground">Knowledge Base: West Africa Logistics & Energy</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    Active Memory
                  </span>
                </div>

                <div className="mt-4 space-y-3.5 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center font-bold text-[10px]">
                      YOU
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted/70 p-3 text-foreground max-w-xl">
                      We want to offer installment plans to smallholder farmers in Ashanti region. What contract structure protects us from default without killing adoption?
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="size-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px]">
                      AZ
                    </div>
                    <div className="rounded-2xl rounded-tl-sm border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 text-foreground max-w-2xl space-y-2">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                        Recommended Structure: Harvest-Linked Micro-Retainers
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        In rural Ghana, rigid monthly cash payments struggle due to seasonal farm cashflows. Instead:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li><strong>15% Commitment Deposit:</strong> Paid via Mobile Money at installation.</li>
                        <li><strong>Flexible Usage Tokens:</strong> Pay-as-you-chill daily rates during peak harvest.</li>
                        <li><strong>Off-take Guarantee Clause:</strong> Partner with local aggregation aggregators to deduct cooling fees directly from market sale proceeds.</li>
                      </ol>
                      <div className="pt-2 flex gap-2">
                        <button type="button" className="rounded-lg bg-emerald-700 px-3 py-1 text-white font-semibold text-[10px]">
                          Generate Draft Agreement
                        </button>
                        <button type="button" className="rounded-lg border border-border bg-background px-3 py-1 font-medium text-[10px]">
                          Add to Legal Checklist
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUSINESS PLAN PREVIEW */}
          {activeTab === "plan" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Comprehensive Business Plan</h4>
                  <p className="text-xs text-muted-foreground">Version 2.4 · Calibrated for Angel & Seed Investors</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    <Download className="size-3.5" /> Export PDF
                  </button>
                  <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-800">
                    <Share2 className="size-3.5" /> Share Read-Only
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/20 p-3.5">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">01. Executive Summary</span>
                  <p className="mt-1 text-muted-foreground line-clamp-3">
                    SolarChill operates off-grid cold storage hubs addressing post-harvest horticulture losses exceeding 40% across West African farm belts.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="font-bold text-foreground">02. Market Size & TAM</span>
                  <p className="mt-1 text-muted-foreground line-clamp-3">
                    Total Addressable Market in Ghana & Côte d&apos;Ivoire horticulture preservation estimated at $420M annually across 320,000 smallholders.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="font-bold text-foreground">03. Unit Economics</span>
                  <p className="mt-1 text-muted-foreground line-clamp-3">
                    Each solar hub yields GHS 4,200 monthly gross revenue against GHS 1,400 maintenance cost, resulting in 66.7% operational gross margin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIAL PLANNING PREVIEW */}
          {activeTab === "finance" && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-2xl border border-border bg-background p-3.5">
                  <p className="text-[10px] text-muted-foreground">Currency System</p>
                  <p className="text-base font-bold text-foreground mt-0.5">GHS / USD</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Dual Tracking</span>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3.5">
                  <p className="text-[10px] text-muted-foreground">Initial Capital Needed</p>
                  <p className="text-base font-bold text-foreground mt-0.5">GHS 240,000</p>
                  <span className="text-[10px] text-muted-foreground">~$19,500 USD</span>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3.5">
                  <p className="text-[10px] text-muted-foreground">Break-Even Point</p>
                  <p className="text-base font-bold text-foreground mt-0.5">Month 7</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Conservative Est.</span>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3.5">
                  <p className="text-[10px] text-muted-foreground">Internal Rate of Return</p>
                  <p className="text-base font-bold text-foreground mt-0.5">38.4%</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Over 36 Months</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 text-xs">
                <h4 className="font-bold text-foreground mb-2">Simulated 12-Month Cashflow Trajectory</h4>
                <div className="h-28 w-full flex items-end gap-2 pt-4 px-2 border-b border-border">
                  {[25, 32, 40, 48, 55, 68, 80, 95, 110, 130, 155, 180].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-emerald-600 dark:bg-emerald-500 opacity-80 hover:opacity-100 transition-opacity"
                        style={{ height: `${(val / 180) * 85}px` }}
                      />
                      <span className="text-[9px] text-muted-foreground">M{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PROJECT MANAGEMENT PREVIEW */}
          {activeTab === "projects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Sprint & Milestone Board</h4>
                  <p className="text-xs text-muted-foreground">Sprint #4 · Target: Market Launch in Kumasi</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                  85% Velocity
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                {/* Column 1: Backlog */}
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">Backlog (3)</span>
                  <div className="rounded-lg bg-card p-2.5 border border-border shadow-xs">
                    <p className="font-semibold text-foreground">Draft MoUs for farm co-op leads</p>
                    <span className="text-[10px] text-muted-foreground">Assigned: Founder</span>
                  </div>
                  <div className="rounded-lg bg-card p-2.5 border border-border shadow-xs">
                    <p className="font-semibold text-foreground">Order backup lithium cells</p>
                    <span className="text-[10px] text-muted-foreground">Assigned: Tech Lead</span>
                  </div>
                </div>

                {/* Column 2: In Progress */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3 space-y-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[10px]">In Progress (2)</span>
                  <div className="rounded-lg bg-card p-2.5 border border-border shadow-xs">
                    <p className="font-semibold text-foreground">Install pilot cooler unit at Ejisu</p>
                    <span className="text-[10px] text-emerald-700 font-semibold">Due in 2 days</span>
                  </div>
                  <div className="rounded-lg bg-card p-2.5 border border-border shadow-xs">
                    <p className="font-semibold text-foreground">Set up Hubtel SMS notification gateway</p>
                    <span className="text-[10px] text-muted-foreground">Due Friday</span>
                  </div>
                </div>

                {/* Column 3: Completed */}
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <span className="font-bold text-muted-foreground uppercase text-[10px]">Done (4)</span>
                  <div className="rounded-lg bg-card p-2.5 border border-border shadow-xs opacity-75">
                    <p className="font-semibold text-foreground line-through">Incorporate company with Registrar General</p>
                    <span className="text-[10px] text-emerald-600 font-bold">✓ Verified</span>
                  </div>
                  <div className="rounded-lg bg-card p-2.5 border border-border shadow-xs opacity-75">
                    <p className="font-semibold text-foreground line-through">Conduct 20 market vendor interviews</p>
                    <span className="text-[10px] text-emerald-600 font-bold">✓ Completed</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
