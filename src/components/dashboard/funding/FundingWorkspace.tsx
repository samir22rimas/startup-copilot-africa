"use client"

import type { FundingWorkspace as FundingWorkspaceData, PitchDeckItem } from "@/src/app/actions/funding"
import { generateFundingWorkspace, saveFundingWorkspace } from "@/src/app/actions/funding"
import { 
  CircleDollarSign, 
  TrendingUp, 
  Lightbulb, 
  HelpCircle, 
  ExternalLink, 
  RefreshCw, 
  Save, 
  Check, 
  Info,
  Calendar
} from "lucide-react"
import * as React from "react"
import { useRouter } from "next/navigation"

interface FundingWorkspaceProps {
  projectId: string
  startup: any
  initialWorkspace: FundingWorkspaceData | null
}

export function FundingWorkspace({ projectId, startup, initialWorkspace }: FundingWorkspaceProps) {
  const router = useRouter()
  const [workspace, setWorkspace] = React.useState<FundingWorkspaceData | null>(initialWorkspace)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Local state for interactive calculators
  const [cashBalance, setCashBalance] = React.useState<number>(initialWorkspace?.cashBalance || 5000)
  const [monthlyBurn, setMonthlyBurn] = React.useState<number>(initialWorkspace?.monthlyBurn || 800)
  const [fundingGoal, setFundingGoal] = React.useState<number>(initialWorkspace?.fundingGoal || 50000)
  const [valuation, setValuation] = React.useState<number>(initialWorkspace?.valuation || 350000)

  // Compute runway and dilution
  const runwayMonths = monthlyBurn > 0 ? parseFloat((cashBalance / monthlyBurn).toFixed(1)) : 0
  const dilutionPercent = valuation > 0 ? parseFloat(((fundingGoal / (valuation + fundingGoal)) * 100).toFixed(1)) : 0

  React.useEffect(() => {
    if (!workspace) {
      handleGenerate()
    } else {
      setCashBalance(workspace.cashBalance)
      setMonthlyBurn(workspace.monthlyBurn)
      setFundingGoal(workspace.fundingGoal)
      setValuation(workspace.valuation)
    }
  }, [workspace])

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const res = await generateFundingWorkspace(projectId)
      if (res.success) {
        setWorkspace(res.workspace)
        router.refresh()
      }
    } catch (err) {
      console.error("Failed to generate funding workspace", err)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave(updatedDeck?: PitchDeckItem[]) {
    if (!workspace) return
    setIsSaving(true)
    try {
      const payload: FundingWorkspaceData = {
        ...workspace,
        cashBalance,
        monthlyBurn,
        fundingGoal,
        valuation,
        dilutionPercent,
        pitchDeck: updatedDeck || workspace.pitchDeck,
      }
      const res = await saveFundingWorkspace(projectId, payload)
      if (res.success) {
        setWorkspace(payload)
        router.refresh()
      }
    } catch (err) {
      console.error("Failed to save funding workspace", err)
    } finally {
      setIsSaving(false)
    }
  }

  function handleTogglePitchItem(itemId: string) {
    if (!workspace) return
    const updated = workspace.pitchDeck.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )
    setWorkspace({ ...workspace, pitchDeck: updated })
    handleSave(updated) // Autosave check status back to database metadata
  }

  if (!workspace) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4 text-center">
        <RefreshCw className="h-8 w-8 text-green-700 animate-spin" />
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">Generating Funding Ready-Room</h2>
          <p className="mt-2 text-sm text-zinc-500">Structuring runway models and mapping African seed pools...</p>
        </div>
      </div>
    )
  }

  const currency = startup.budget_currency || "USD"
  const pitchCompleted = workspace.pitchDeck.filter(item => item.checked).length

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-700">Fundraising & runway &mdash; {startup.name}</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
            Capital & Runway Control
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Model cash runway, draft investor pitch checklists, and track opportunities matching African ecosystems.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isGenerating ? "animate-spin" : ""}`} /> Reset defaults
          </button>
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white shadow-lg shadow-green-900/10 hover:shadow-green-900/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:bg-green-800 disabled:opacity-50"
          >
            <Save className={`size-4 ${isSaving ? "animate-spin" : ""}`} /> 
            {isSaving ? "Saving..." : "Save Workspace"}
          </button>
        </div>
      </div>

      {/* Runway Status Banner */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className={`rounded-3xl border p-8 shadow-sm transition-all duration-300 md:col-span-2 ${
          runwayMonths >= 12 
            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20" 
            : runwayMonths >= 6 
            ? "border-amber-200 bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-950/15" 
            : "border-rose-200 bg-rose-50/40 dark:border-rose-800/30 dark:bg-rose-950/15"
        }`}>
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-lg">Operational Cash Runway</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Based on current cash balance and monthly burn rate.</p>
              
              <div className="mt-6 flex items-baseline gap-2">
                <span className={`text-5xl font-black ${
                  runwayMonths >= 12 ? "text-emerald-700 dark:text-emerald-400" : runwayMonths >= 6 ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400"
                }`}>
                  {runwayMonths}
                </span>
                <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">months left</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
                {runwayMonths >= 12 
                  ? "Excellent. You have over a year of runway to focus on validating customer acquisition and product development." 
                  : runwayMonths >= 6 
                  ? "Healthy baseline. Start planning your funding campaign or cost efficiency actions to avoid crunch zones." 
                  : "Critical runway. You should prioritize commercial contracts or immediately structure a grant/seed campaign."}
              </p>
            </div>
            
            <div className="flex-1 max-w-sm space-y-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm">
              <h3 className="font-semibold text-xs text-zinc-400 uppercase tracking-wider">Adjust cash runway assumptions</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500">Cash Balance ({currency})</label>
                  <input 
                    type="number" 
                    value={cashBalance} 
                    onChange={(e) => setCashBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500">Monthly Burn ({currency})</label>
                  <input 
                    type="number" 
                    value={monthlyBurn} 
                    onChange={(e) => setMonthlyBurn(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full mt-1 px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-600 bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dilution Estimator */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">Equity Dilution Estimator</h3>
            <p className="text-xs text-zinc-500">Simulate pre-seed dilution on post-money value.</p>
            
            <div className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500">Capital to Raise ({currency})</label>
                <input 
                  type="number" 
                  value={fundingGoal} 
                  onChange={(e) => setFundingGoal(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-transparent"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500">Pre-Money Valuation ({currency})</label>
                <input 
                  type="number" 
                  value={valuation} 
                  onChange={(e) => setValuation(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full mt-1 px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-4 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-500">Estimated Dilution</span>
              <span className="block font-bold text-lg text-green-700">{dilutionPercent}%</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500">Post-Money Val.</span>
              <span className="block font-bold text-zinc-800 dark:text-zinc-200">
                {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(valuation + fundingGoal)} {currency}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Checklist & Opportunities */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* Pitch Deck Checklist */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white">Pitch Deck Progress</h3>
              <p className="text-xs text-zinc-500">Build key investor story slides aligned with African markets.</p>
            </div>
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 dark:bg-green-950/40 dark:text-green-400">
              {pitchCompleted}/{workspace.pitchDeck.length} complete
            </span>
          </div>

          <div className="space-y-2 mt-4 max-h-[360px] overflow-y-auto pr-1">
            {workspace.pitchDeck.map((item) => (
              <label 
                key={item.id} 
                className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer transition-colors duration-300"
              >
                <input 
                  type="checkbox" 
                  checked={item.checked} 
                  onChange={() => handleTogglePitchItem(item.id)}
                  className="mt-1 size-4 rounded-md border-zinc-300 text-green-600 focus:ring-green-500"
                />
                <div>
                  <span className={`text-xs font-bold block ${item.checked ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-white"}`}>
                    {item.label}
                  </span>
                  <span className="text-[11px] text-zinc-500 leading-normal block mt-0.5">{item.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Opportunities & AI Recommendations */}
        <div className="space-y-6">
          {/* Opportunities list */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md">
            <div className="mb-4">
              <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Calendar className="size-4.5 text-green-700" /> Regional Funding Programs
              </h3>
              <p className="text-xs text-zinc-500">Accelerators and grant pools designed specifically for African startups.</p>
            </div>
            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
              {workspace.opportunities.map((opp) => (
                <div key={opp.name} className="p-3 border border-zinc-100 dark:border-zinc-850 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{opp.name}</span>
                    <span className="shrink-0 text-[10px] font-bold bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded-full">
                      {opp.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-2 space-y-1">
                    <p>Range: <span className="font-medium text-zinc-700 dark:text-zinc-300">{opp.amountRange}</span></p>
                    <p>Focus: {opp.focus}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px]">
                    <span className="text-amber-600 font-medium">Deadline: {opp.deadline}</span>
                    <a 
                      href={opp.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-0.5 text-green-700 hover:underline font-bold"
                    >
                      Apply website <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Advisor Recommendations */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="size-5 text-green-700 animate-pulse" />
              <h3 className="font-bold text-zinc-900 dark:text-white">AI Advisor Funding Strategy</h3>
            </div>
            <div className="space-y-3">
              {workspace.recommendations.map((rec) => (
                <div key={rec.title} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80">
                  <h4 className="text-[11px] font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Check className="size-3 text-green-700 shrink-0" />
                    {rec.title}
                  </h4>
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {rec.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
