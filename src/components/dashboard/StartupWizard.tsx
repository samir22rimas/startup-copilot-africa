"use client"

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import * as React from "react"

import { createStartupAndFirstProject } from "@/src/app/actions/dashboard"
import { saveOnboardingDetails } from "@/src/app/actions/onboarding"
import { Field, Notice, Panel, inputClass, primaryButtonClass, secondaryButtonClass, textareaClass } from "@/src/components/ui/page"
import { AFRICAN_COUNTRIES, formatAfricanCountryOption, getAfricanCountryCurrency } from "@/src/lib/african-countries"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { INDUSTRIES, INDUSTRY_GROUPS } from "@/src/lib/industries"
import { cn } from "@/src/lib/utils"

const STAGES = ["idea", "validation", "mvp", "early_revenue", "growth", "scale"] as const
const EXPERIENCE = ["first_time", "some_experience", "experienced", "serial"] as const

type Stage = (typeof STAGES)[number]
type Experience = (typeof EXPERIENCE)[number]

/** Two short steps to create a business workspace; the adaptive interview follows. */
export function StartupWizard({ defaultCountry = "CM" }: { defaultCountry?: string }) {
  const { t } = useI18n()
  const o = t.onboarding
  const [step, setStep] = React.useState<1 | 2>(1)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const [name, setName] = React.useState("")
  const [projectTitle, setProjectTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [countryCode, setCountryCode] = React.useState(defaultCountry)
  const [city, setCity] = React.useState("")
  const [industry, setIndustry] = React.useState("")
  const [budget, setBudget] = React.useState("")
  const [stage, setStage] = React.useState<Stage>("idea")
  const [experience, setExperience] = React.useState<Experience>("first_time")
  const [objectives, setObjectives] = React.useState("")

  const currency = getAfricanCountryCurrency(countryCode)

  function next(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setStep(2)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError("")
    try {
      const created = await createStartupAndFirstProject({
        name,
        countryCode,
        city,
        industry,
        estimatedBudgetCents: Math.max(0, Math.round((Number(budget) || 0) * 100)),
        budgetCurrency: currency,
        projectTitle: projectTitle || name,
        projectDescription: description,
      })
      if (!created.success) {
        setError(created.error || t.common.errorGeneric)
        setLoading(false)
        return
      }
      const details = await saveOnboardingDetails({
        startupId: created.startup.id,
        stage,
        experienceLevel: experience,
        description,
        objectives: objectives
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length >= 2)
          .slice(0, 6),
      })
      if (!details.success) console.warn(details.error)
      window.location.assign("/dashboard")
    } catch {
      setError(t.common.errorGeneric)
      setLoading(false)
    }
  }

  return (
    <Panel className="mx-auto max-w-2xl p-5 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{fmt(o.step, { step, total: 2 })}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{step === 1 ? o.wizardTitle : o.wizardTitle2}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{step === 1 ? o.wizardBody : o.wizardBody2}</p>

      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        <span className="h-1 flex-1 rounded-full bg-primary" />
        <span className={cn("h-1 flex-1 rounded-full", step === 2 ? "bg-primary" : "bg-muted")} />
      </div>

      {error && (
        <Notice tone="warning" className="mt-5">
          {error}
        </Notice>
      )}

      {step === 1 ? (
        <form onSubmit={next} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={o.businessName} htmlFor="wiz-name">
              <input id="wiz-name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={o.businessNamePlaceholder} className={inputClass} />
            </Field>
            <Field label={o.offer} htmlFor="wiz-offer">
              <input id="wiz-offer" required minLength={2} maxLength={160} value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder={o.offerPlaceholder} className={inputClass} />
            </Field>
          </div>
          <Field label={o.description} hint={o.descriptionHint} htmlFor="wiz-description">
            <textarea id="wiz-description" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={o.descriptionPlaceholder} className={textareaClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={o.country} htmlFor="wiz-country">
              <select id="wiz-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={inputClass}>
                {AFRICAN_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {formatAfricanCountryOption(country)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={o.city} htmlFor="wiz-city">
              <input id="wiz-city" required maxLength={120} value={city} onChange={(e) => setCity(e.target.value)} placeholder={o.cityPlaceholder} className={inputClass} />
            </Field>
            <Field label={o.industry} htmlFor="wiz-industry">
              <select id="wiz-industry" required value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputClass}>
                <option value="" disabled>
                  {o.industryPlaceholder}
                </option>
                {INDUSTRY_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {INDUSTRIES.filter((item) => item.group === group).map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label={fmt(o.budget, { currency })} hint={o.budgetHint} htmlFor="wiz-budget">
              <input id="wiz-budget" type="number" min={0} inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <button type="submit" className={cn(primaryButtonClass, "h-10 w-full")}>
            {t.common.next} <ArrowRight className="size-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-foreground">{o.stageLabel}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {STAGES.map((key) => (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition",
                    stage === key ? "border-primary bg-accent/60 ring-1 ring-primary" : "border-border hover:bg-muted/60",
                  )}
                >
                  <input type="radio" name="stage" value={key} checked={stage === key} onChange={() => setStage(key)} className="mt-1 accent-[var(--primary)]" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{t.stages[key]}</span>
                    <span className="block text-xs text-muted-foreground">{o.stageHints[key]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field label={o.experienceLabel} htmlFor="wiz-experience">
            <select id="wiz-experience" value={experience} onChange={(e) => setExperience(e.target.value as Experience)} className={inputClass}>
              {EXPERIENCE.map((key) => (
                <option key={key} value={key}>
                  {o.experience[key]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={o.objectives} hint={o.objectivesHint} htmlFor="wiz-objectives">
            <textarea id="wiz-objectives" rows={3} maxLength={1200} value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder={o.objectivesPlaceholder} className={textareaClass} />
          </Field>

          <div className="flex gap-2">
            <button type="button" disabled={loading} onClick={() => setStep(1)} className={cn(secondaryButtonClass, "h-10")}>
              <ArrowLeft className="size-4" /> {t.common.back}
            </button>
            <button type="submit" disabled={loading} className={cn(primaryButtonClass, "h-10 flex-1")}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? o.creating : o.createAndStart}
              {!loading && <ArrowRight className="size-4" />}
            </button>
          </div>
        </form>
      )}
    </Panel>
  )
}
