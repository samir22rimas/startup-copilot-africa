"use client"

import * as React from "react"
import {
  Scale,
  Building2,
  FileCheck,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  FileText,
} from "lucide-react"
import { LegalWorkspace as ILegalWorkspace, generateLegalComplianceWorkspace, refreshLegalComplianceWorkspace } from "@/src/app/actions/legal"

interface LegalWorkspaceProps {
  projectId: string
  startupName: string
  countryCode: string
  industry: string
  initialWorkspace: ILegalWorkspace | null
}

export function LegalWorkspaceUI({
  projectId,
  startupName,
  countryCode,
  industry,
  initialWorkspace,
}: LegalWorkspaceProps) {
  const [workspace, setWorkspace] = React.useState<ILegalWorkspace | null>(initialWorkspace)
  const [loading, setLoading] = React.useState(!initialWorkspace)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!initialWorkspace) {
      handleGenerate()
    }
  }, [initialWorkspace])

  async function handleGenerate() {
    setLoading(true)
    setError("")
    try {
      const res = await generateLegalComplianceWorkspace(projectId)
      if (res.success) {
        setWorkspace(res.workspace)
      } else {
        setError(res.error)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load legal analysis.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    setError("")
    try {
      const res = await refreshLegalComplianceWorkspace(projectId)
      if (res.success) {
        setWorkspace(res.workspace)
      } else {
        setError(res.error)
      }
    } catch (err: any) {
      setError(err.message || "Failed to refresh legal analysis.")
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 mb-4 animate-pulse">
          <Scale className="size-7" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Analyzing Legal & Compliance Requirements...</h3>
        <p className="mt-2 text-sm text-zinc-500 max-w-md">
          Consulting AI legal advisor for corporate laws, tax PINs, licenses, and data privacy regulations in {countryCode}.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Loader2 className="size-4 animate-spin" /> Analyzing regional regulator guidelines...
        </div>
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-950/50 dark:bg-red-950/20">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/50">
          <AlertTriangle className="size-6" />
        </div>
        <h3 className="mt-4 font-bold text-red-900 dark:text-red-200">Legal Analysis Failed</h3>
        <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error || "Could not generate legal requirements."}</p>
        <button
          onClick={handleGenerate}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-3xl bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Scale className="size-4" /> Legal & Regulatory Permissions ({workspace.countryName})
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Compliance Roadmap for {startupName}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-300 max-w-xl">
              AI-analyzed licensing, tax PIN registration, corporate entity recommendations, and data protection rules for {industry} startups in {workspace.countryName}.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/20 disabled:opacity-50 shrink-0 border border-white/10"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Re-analyzing..." : "Re-analyze Legal Guide"}
          </button>
        </div>
      </div>

      {/* Grid Section 1: Entity & Data Privacy */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recommended Corporate Entity */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50">
              <Building2 className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Corporate Entity Structure</h3>
              <p className="text-xs text-zinc-500">Recommended incorporation type</p>
            </div>
          </div>

          <div className="rounded-2xl bg-green-50/70 p-4 border border-green-200/50 dark:bg-green-950/30 dark:border-green-900/30">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Best Match</span>
            <h4 className="text-lg font-extrabold text-zinc-900 dark:text-white mt-0.5">{workspace.recommendedEntityType}</h4>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {workspace.entityDescription}
          </p>
        </div>

        {/* Data Privacy & Compliance */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Data Protection & Privacy</h3>
              <p className="text-xs text-zinc-500">{workspace.dataPrivacyRequirements.actName}</p>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            Regulator: <strong className="text-zinc-800 dark:text-zinc-200">{workspace.dataPrivacyRequirements.commissioner}</strong>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Key Compliance Obligations</span>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              {workspace.dataPrivacyRequirements.keyObligations.map((ob, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{ob}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Required Licenses & Permits Table */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50">
            <FileCheck className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Mandatory Sector Licenses & Permits</h3>
            <p className="text-xs text-zinc-500">Required authorities and estimated licensing fees</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {workspace.requiredLicenses.map((lic, idx) => (
            <div key={idx} className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{lic.name}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${lic.mandatory ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" : "bg-zinc-200 text-zinc-700"}`}>
                  {lic.mandatory ? "Mandatory" : "Optional"}
                </span>
              </div>
              <p className="text-xs text-zinc-500">Authority: <strong>{lic.authority}</strong></p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{lic.description}</p>
              <div className="pt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <DollarSign className="size-3.5" /> Estimated Cost: {lic.estimatedCost}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tax & Social Security Obligations */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50">
            <FileText className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Tax & Statutory Filings</h3>
            <p className="text-xs text-zinc-500">Revenue authority PIN, VAT, PAYE, and social security</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {workspace.taxObligations.map((tax, idx) => (
            <div key={idx} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">{tax.agency}</span>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{tax.name}</h4>
              <p className="text-xs text-zinc-500">Filing: {tax.frequency}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">{tax.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-Step Setup Checklist */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50">
            <Clock className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Step-by-Step Incorporation Checklist</h3>
            <p className="text-xs text-zinc-500">Follow these steps in order to legally register in {workspace.countryName}</p>
          </div>
        </div>

        <div className="space-y-3">
          {workspace.setupChecklist.map((step) => (
            <div key={step.step} className="flex items-start gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-700 font-extrabold text-sm text-white shadow-sm">
                {step.step}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{step.title}</h4>
                  <span className="text-xs text-zinc-400">Timeline: {step.timeline}</span>
                </div>
                <p className="text-xs text-zinc-500">Authority: <strong>{step.authority}</strong></p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
