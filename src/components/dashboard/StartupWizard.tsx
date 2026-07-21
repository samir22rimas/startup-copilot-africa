"use client"

import * as React from "react"
import { Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { createStartupAndFirstProject } from "@/src/app/actions/dashboard"

const AFRICAN_COUNTRIES = [
  { code: "KE", name: "Kenya (KES)", currency: "KES" },
  { code: "NG", name: "Nigeria (NGN)", currency: "NGN" },
  { code: "GH", name: "Ghana (GHS)", currency: "GHS" },
  { code: "ZA", name: "South Africa (ZAR)", currency: "ZAR" },
  { code: "EG", name: "Egypt (EGP)", currency: "EGP" },
  { code: "MA", name: "Morocco (MAD)", currency: "MAD" },
  { code: "RW", name: "Rwanda (RWF)", currency: "RWF" },
  { code: "TZ", name: "Tanzania (TZS)", currency: "TZS" },
  { code: "UG", name: "Uganda (UGX)", currency: "UGX" },
]

export function StartupWizard() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const [name, setName] = React.useState("")
  const [projectTitle, setProjectTitle] = React.useState("")
  const [projectDescription, setProjectDescription] = React.useState("")
  const [countryCode, setCountryCode] = React.useState("KE")
  const [city, setCity] = React.useState("")
  const [industry, setIndustry] = React.useState("Agriculture")
  const [budgetAmount, setBudgetAmount] = React.useState("1000")

  const selectedCountry = AFRICAN_COUNTRIES.find(c => c.code === countryCode)
  const currency = selectedCountry?.currency || "USD"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !projectTitle.trim()) {
      setError("Please fill in the startup name and project title.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const budgetCents = parseFloat(budgetAmount) * 100 || 0
      const res = await createStartupAndFirstProject({
        name,
        countryCode,
        city,
        industry,
        estimatedBudgetCents: budgetCents,
        budgetCurrency: currency,
        projectTitle,
        projectDescription,
      })

      if (res && !res.success) {
        setError(res.error || "Something went wrong. Please try again.")
        setLoading(false)
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-10 transition-all duration-500 hover:shadow-2xl font-sans">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-green-100 text-green-700 dark:bg-green-950/50 shadow-sm shrink-0">
          <Sparkles className="size-6 text-green-700 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">Let&apos;s build your co-founder engine</h1>
          <p className="mt-1 text-sm text-zinc-500">Provide a few basic details about your business concept to begin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-100 dark:border-red-900/30 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Startup / Company Name</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jambo Logistics"
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label htmlFor="projectTitle" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Project / Idea Title</label>
            <input
              id="projectTitle"
              type="text"
              required
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. Last-Mile Cold Delivery"
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </div>

        <div>
          <label htmlFor="projectDescription" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Describe your product/service idea</label>
          <textarea
            id="projectDescription"
            rows={3}
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Tell us what you plan to sell, who the customer is, and how you will deliver value..."
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label htmlFor="country" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Country of Operation</label>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {AFRICAN_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">City / Town</label>
            <input
              id="city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Nairobi"
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label htmlFor="industry" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Industry / Sector</label>
            <select
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="Agriculture">Agriculture / Agrotech</option>
              <option value="Fintech">Financial Services / Fintech</option>
              <option value="Healthtech">Healthcare / Healthtech</option>
              <option value="Logistics">Logistics & Supply Chain</option>
              <option value="E-Commerce">E-Commerce & Retail</option>
              <option value="Edtech">Education / Edtech</option>
              <option value="Clean Energy">Clean Energy / Solar</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="budget" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Starting Budget ({currency})</label>
          <input
            id="budget"
            type="number"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 font-semibold text-white transition-all duration-300 hover:bg-green-800 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-md shadow-green-900/15"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Starting configuration...
            </>
          ) : (
            <>
              Start onboarding interview <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
