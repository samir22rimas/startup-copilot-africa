import * as React from "react"
import {
  BookOpen,
  Bot,
  BarChart3,
  CircleDollarSign,
  FileText,
  Megaphone,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Target,
  DollarSign,
  PieChart,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default function UserGuidePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      {/* Header */}
      <div className="rounded-3xl bg-linear-to-r from-green-900 via-green-800 to-emerald-900 p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 text-green-300 font-semibold text-xs uppercase tracking-wider mb-2">
          <BookOpen className="size-4" /> Startup Copilot Africa Guide
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          How to Use Startup Copilot & Understand Your Metrics
        </h1>
        <p className="mt-3 text-base text-green-100/80 max-w-2xl leading-relaxed">
          Welcome! This guide explains how to navigate Startup Copilot Africa, leverage our AI advisors, and read all the analytics, funding metrics, and strategic insights generated for your startup.
        </p>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <a href="#copilot" className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-green-600 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50">
            <Bot className="size-5" />
          </div>
          <h3 className="mt-4 font-bold text-zinc-900 dark:text-white group-hover:text-green-600 transition">1. AI Copilot Advisor</h3>
          <p className="mt-1 text-xs text-zinc-500">Interactive guidance & localized strategic advice.</p>
        </a>

        <a href="#analytics" className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-green-600 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50">
            <BarChart3 className="size-5" />
          </div>
          <h3 className="mt-4 font-bold text-zinc-900 dark:text-white group-hover:text-green-600 transition">2. Reading Analytics</h3>
          <p className="mt-1 text-xs text-zinc-500">MRR, CAC, LTV, conversion funnels & payment breakdown.</p>
        </a>

        <a href="#funding" className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-green-600 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50">
            <CircleDollarSign className="size-5" />
          </div>
          <h3 className="mt-4 font-bold text-zinc-900 dark:text-white group-hover:text-green-600 transition">3. Funding & Pitch Deck</h3>
          <p className="mt-1 text-xs text-zinc-500">Valuations, monthly burn, runway & slide generators.</p>
        </a>
      </div>

      {/* Section 1: Copilot */}
      <section id="copilot" className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50">
            <Bot className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">1. Using the AI Copilot & Business Interview</h2>
            <p className="text-xs text-zinc-500">Your dedicated 24/7 AI co-founder for African business strategy.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" /> Interactive Business Interview
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              When starting out, the Copilot conducts a multi-step interview tailored to your launch country (e.g. Kenya, Nigeria, South Africa). Answer each question candidly to help the AI understand your target audience, pricing model, and go-to-market strategy.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" /> Stateful Dashboard Assistance
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              At the bottom of your main Dashboard, you can chat with your Copilot anytime. Ask questions like: <em>&quot;How do I integrate Mobile Money in Nairobi?&quot;</em> or <em>&quot;What is a realistic price point for B2B SaaS in Lagos?&quot;</em>
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Reading Analytics Values */}
      <section id="analytics" className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">2. How to Read Analytics Values</h2>
            <p className="text-xs text-zinc-500">Understanding KPIs, conversion rates, and localized channels.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Key Metrics Breakdown */}
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50 space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-600" /> Core KPI Glossary
            </h3>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div>
                <strong className="text-zinc-900 dark:text-zinc-200">MRR (Monthly Recurring Revenue):</strong>
                <p>The total predictable revenue generated by your active subscriptions or recurring customers per month.</p>
              </div>

              <div>
                <strong className="text-zinc-900 dark:text-zinc-200">CAC (Customer Acquisition Cost):</strong>
                <p>The average total marketing and sales expense required to acquire a single paying customer. (Lower is better!)</p>
              </div>

              <div>
                <strong className="text-zinc-900 dark:text-zinc-200">LTV (Lifetime Value):</strong>
                <p>The estimated total revenue a customer will generate throughout their relationship with your product.</p>
              </div>

              <div>
                <strong className="text-zinc-900 dark:text-zinc-200">LTV / CAC Ratio:</strong>
                <p>A measure of efficiency. A ratio of 3x or higher means your business model is highly healthy and scalable.</p>
              </div>
            </div>
          </div>

          {/* Funnel & Channel Explanation */}
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50 space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
              <PieChart className="size-4 text-emerald-600" /> Funnels & Payment Channels
            </h3>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div>
                <strong className="text-zinc-900 dark:text-zinc-200">Conversion Funnel:</strong>
                <p>Tracks dropoff from Discovery Visitors → Signups → Active Users → Paying Customers. Identifying large drop-offs helps pinpoint UI or pricing friction.</p>
              </div>

              <div>
                <strong className="text-zinc-900 dark:text-zinc-200">Localized Payment Channels:</strong>
                <p>Analyzes transactions split between Mobile Money (M-Pesa, MTN MoMo, Orange, Wave), Card Payments (Visa/Mastercard), and Bank Transfers.</p>
              </div>

              <div>
                <strong className="text-zinc-900 dark:text-zinc-200">AI Analytics Generation:</strong>
                <p>When you click &quot;Generate Workspace&quot;, the AI evaluates your specific startup industry and region to project benchmark performance numbers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Funding & Pitch Deck */}
      <section id="funding" className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50">
            <CircleDollarSign className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">3. Funding Workspace & Pitch Deck Generator</h2>
            <p className="text-xs text-zinc-500">Managing runway, dilution, valuation, and investor presentations.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 space-y-2">
            <h4 className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider text-amber-600">Monthly Burn Rate</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              The amount of cash your startup spends each month on salaries, servers, marketing, and operations before earning profits.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 space-y-2">
            <h4 className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider text-green-600">Funding Goal & Valuation</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              The total capital you are raising, mapped against your pre-money valuation to calculate equity dilution for angel/seed rounds.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 space-y-2">
            <h4 className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider text-blue-600">Real Opportunities</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              The AI automatically searches and suggests curated grants, VCs, and accelerators tailored to African founders.
            </p>
          </div>
        </div>
      </section>

      {/* Action Footer */}
      <div className="rounded-3xl border border-green-200 bg-green-50/60 p-6 dark:border-green-900/30 dark:bg-green-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-white text-base">Ready to build your startup?</h3>
          <p className="text-xs text-zinc-500">Go to your main overview dashboard to view your progress and chat with Copilot.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 shrink-0"
        >
          Go to Dashboard <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
