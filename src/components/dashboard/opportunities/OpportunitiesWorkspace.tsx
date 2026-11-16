"use client"

import { Bookmark, BookmarkCheck, CalendarDays, Compass, ExternalLink, ShieldCheck } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { trackOpportunity, type Opportunity, type OpportunityTracking } from "@/src/app/actions/opportunities"
import { Tabs } from "@/src/components/ui/overlay"
import { Badge, EmptyState, Field, Notice, Panel, inputClass, secondaryButtonClass, textareaClass } from "@/src/components/ui/page"
import { AFRICAN_COUNTRIES, getAfricanCountryName } from "@/src/lib/african-countries"
import type { ApplicationStatus, FundingType, OpportunityType } from "@/src/lib/database.v2.types"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { INDUSTRIES, getIndustryLabel } from "@/src/lib/industries"
import { cn } from "@/src/lib/utils"

type Tab = "browse" | "tracked"

const TYPES: OpportunityType[] = ["grant", "funding_program", "accelerator", "incubator", "competition", "challenge", "mentorship", "scholarship", "event"]
const FUNDING: FundingType[] = ["grant", "equity", "debt", "prize", "non_financial", "mixed"]
const STAGES = ["idea", "validation", "mvp", "early_revenue", "growth", "scale"] as const
const STATUSES: ApplicationStatus[] = ["none", "preparing", "submitted", "accepted", "rejected"]
const DAY = 86_400_000

export function OpportunitiesWorkspace({
  opportunities,
  initialTracking,
  business,
  canEdit,
}: {
  opportunities: Opportunity[]
  initialTracking: OpportunityTracking[]
  business: { countryCode: string; stage: string; industry: string | null }
  canEdit: boolean
}) {
  const { t, locale } = useI18n()
  const o = t.opportunities
  const [tab, setTab] = React.useState<Tab>("browse")
  const [tracking, setTracking] = React.useState(() => new Map(initialTracking.map((item) => [item.opportunity_id, item])))
  const [country, setCountry] = React.useState("")
  const [type, setType] = React.useState("")
  const [stage, setStage] = React.useState("")
  const [funding, setFunding] = React.useState("")
  const [industry, setIndustry] = React.useState("")
  const [deadline, setDeadline] = React.useState("")

  const today = new Date().toISOString().slice(0, 10)
  const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })

  function matchMine() {
    setCountry(business.countryCode)
    setStage(business.stage)
    setIndustry("")
    setType("")
    setFunding("")
    setDeadline("")
  }

  const filtered = opportunities.filter((item) => {
    if (country && item.countries.length && !item.countries.includes(country)) return false
    if (type && item.type !== type) return false
    if (stage && item.stages.length && !item.stages.includes(stage)) return false
    if (funding && item.funding_type !== funding) return false
    if (industry && item.industries.length && !item.industries.includes(industry)) return false
    if (deadline === "rolling" && !item.is_rolling) return false
    if (deadline === "30" || deadline === "90") {
      if (!item.deadline || item.deadline < today) return false
      const limit = new Date(Date.now() + Number(deadline) * DAY).toISOString().slice(0, 10)
      if (item.deadline > limit) return false
    }
    return true
  })

  const tracked = opportunities.filter((item) => {
    const entry = tracking.get(item.id)
    return entry && (entry.bookmarked || entry.application_status !== "none")
  })

  async function update(id: string, patch: Parameters<typeof trackOpportunity>[1]) {
    const previous = tracking.get(id)
    const optimistic: OpportunityTracking = {
      opportunity_id: id,
      bookmarked: patch.bookmarked ?? previous?.bookmarked ?? true,
      application_status: patch.applicationStatus ?? previous?.application_status ?? "none",
      notes: patch.notes ?? previous?.notes ?? "",
    }
    setTracking((map) => new Map(map).set(id, optimistic))
    const result = await trackOpportunity(id, patch)
    if (!result.success) {
      setTracking((map) => {
        const next = new Map(map)
        if (previous) next.set(id, previous)
        else next.delete(id)
        return next
      })
      toast.error(result.error)
    }
  }

  function renderCard(item: Opportunity, detailed: boolean) {
    const entry = tracking.get(item.id)
    const passed = Boolean(item.deadline && item.deadline < today)
    const stale = Date.now() - new Date(`${item.last_verified_at}T00:00:00`).getTime() > 90 * DAY
    return (
      <Panel key={item.id} as="article" className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">{o.types[item.type]}</Badge>
              <Badge>{o.fundingTypes[item.funding_type]}</Badge>
            </div>
            <h3 className="mt-2 text-base font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.organization}</p>
          </div>
          {canEdit && (
            <button
              type="button"
              aria-pressed={Boolean(entry?.bookmarked)}
              onClick={() => update(item.id, { bookmarked: !entry?.bookmarked })}
              className={cn(secondaryButtonClass, "h-8 shrink-0 text-xs")}
            >
              {entry?.bookmarked ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
              {entry?.bookmarked ? o.bookmarked : o.bookmark}
            </button>
          )}
        </div>

        {item.description && <p className="mt-3 text-sm leading-relaxed text-foreground">{item.description}</p>}

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">{o.country}</dt>
            <dd className="text-foreground">{item.countries.length ? item.countries.map((code) => getAfricanCountryName(code)).join(", ") : o.panAfrican}</dd>
          </div>
          {item.amount_text && (
            <div>
              <dt className="text-xs text-muted-foreground">{o.amount}</dt>
              <dd className="text-foreground">{item.amount_text}</dd>
            </div>
          )}
          {item.stages.length > 0 && (
            <div>
              <dt className="text-xs text-muted-foreground">{o.stage}</dt>
              <dd className="text-foreground">{item.stages.map((key) => t.stages[key as keyof typeof t.stages] ?? key).join(", ")}</dd>
            </div>
          )}
          {item.industries.length > 0 && (
            <div>
              <dt className="text-xs text-muted-foreground">{o.industry}</dt>
              <dd className="text-foreground">{item.industries.map((key) => getIndustryLabel(key)).join(", ")}</dd>
            </div>
          )}
          {item.eligibility && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">{o.eligibility}</dt>
              <dd className="text-foreground">{item.eligibility}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
          <Badge tone={passed ? "red" : item.deadline ? "amber" : "neutral"}>
            <CalendarDays className="size-3" />
            {item.is_rolling ? o.rolling : item.deadline ? (passed ? o.deadlinePassed : fmt(o.deadlineOn, { date: formatDate(item.deadline) })) : o.noDeadline}
          </Badge>
          <span className="flex items-center gap-1 text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" /> {fmt(o.verifiedOn, { date: formatDate(item.last_verified_at) })}
          </span>
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline">
            {item.source_name || o.source} <ExternalLink className="size-3.5" />
          </a>
        </div>
        {stale && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{o.staleWarning}</p>}

        {detailed && canEdit && (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[12rem_1fr]">
            <Field label={o.applicationStatus} htmlFor={`status-${item.id}`}>
              <select
                id={`status-${item.id}`}
                value={entry?.application_status ?? "none"}
                onChange={(event) => update(item.id, { applicationStatus: event.target.value as ApplicationStatus })}
                className={inputClass}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {o.statuses[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={o.notes} htmlFor={`notes-${item.id}`}>
              <textarea
                id={`notes-${item.id}`}
                rows={2}
                maxLength={2000}
                defaultValue={entry?.notes ?? ""}
                onBlur={(event) => {
                  if (event.target.value !== (entry?.notes ?? "")) void update(item.id, { notes: event.target.value })
                }}
                placeholder={o.notesPlaceholder}
                className={textareaClass}
              />
            </Field>
          </div>
        )}
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <Notice tone="info">{o.verifiedOnly}</Notice>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        label={t.pages.opportunities.title}
        items={[
          { id: "browse", label: o.tabBrowse, count: opportunities.length },
          { id: "tracked", label: o.tabTracked, count: tracked.length },
        ]}
      />

      {tab === "browse" &&
        (opportunities.length === 0 ? (
          <Panel>
            <EmptyState icon={Compass} title={o.emptyTitle} description={o.emptyBody} />
          </Panel>
        ) : (
          <>
            <Panel className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">{o.filters}</h2>
                <button type="button" onClick={matchMine} className={cn(secondaryButtonClass, "h-8 text-xs")}>
                  {o.matchMine}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <select aria-label={o.country} value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                  <option value="">{o.allCountries}</option>
                  {AFRICAN_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select aria-label={o.type} value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                  <option value="">{o.allTypes}</option>
                  {TYPES.map((key) => (
                    <option key={key} value={key}>
                      {o.types[key]}
                    </option>
                  ))}
                </select>
                <select aria-label={o.stage} value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
                  <option value="">{o.allStages}</option>
                  {STAGES.map((key) => (
                    <option key={key} value={key}>
                      {t.stages[key]}
                    </option>
                  ))}
                </select>
                <select aria-label={o.fundingType} value={funding} onChange={(e) => setFunding(e.target.value)} className={inputClass}>
                  <option value="">{o.allFunding}</option>
                  {FUNDING.map((key) => (
                    <option key={key} value={key}>
                      {o.fundingTypes[key]}
                    </option>
                  ))}
                </select>
                <select aria-label={o.industry} value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputClass}>
                  <option value="">{o.allIndustries}</option>
                  {INDUSTRIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select aria-label={o.deadline} value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass}>
                  <option value="">{o.anyDeadline}</option>
                  <option value="30">{o.deadline30}</option>
                  <option value="90">{o.deadline90}</option>
                  <option value="rolling">{o.rolling}</option>
                </select>
              </div>
            </Panel>
            {filtered.length === 0 ? (
              <Panel className="p-8 text-center text-sm text-muted-foreground">{o.emptyFiltered}</Panel>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {filtered.map((item) => renderCard(item, false))}
              </div>
            )}
          </>
        ))}

      {tab === "tracked" &&
        (tracked.length === 0 ? (
          <Panel>
            <EmptyState icon={Bookmark} title={o.trackedEmptyTitle} description={o.trackedEmptyBody} />
          </Panel>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {tracked.map((item) => renderCard(item, true))}
          </div>
        ))}
    </div>
  )
}
