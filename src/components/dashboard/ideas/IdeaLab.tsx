"use client"

import { ArrowRight, Bookmark, BookmarkCheck, Lightbulb, Loader2, Rocket, Sparkles, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import {
  convertIdeaToBusiness,
  deleteIdea,
  generateIdeas,
  saveIdea,
  updateIdeaRatings,
  type SavedIdea,
} from "@/src/app/actions/ideas"
import { Modal, Tabs } from "@/src/components/ui/overlay"
import {
  Badge,
  EmptyState,
  Field,
  Notice,
  Panel,
  PanelHeader,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
  type BadgeTone,
} from "@/src/components/ui/page"
import { AFRICAN_COUNTRIES, formatAfricanCountryOption, getAfricanCountryCurrency } from "@/src/lib/african-countries"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import {
  IDEA_CRITERIA,
  computeIdeaScore,
  ideaScoreBreakdown,
  ideaVerdict,
  type GeneratedIdea,
  type IdeaCriterionKey,
  type IdeaVerdict,
} from "@/src/lib/ideas/score"
import { INDUSTRIES, INDUSTRY_GROUPS } from "@/src/lib/industries"
import { cn } from "@/src/lib/utils"

type Mode = "skills" | "academic" | "problem" | "market"
type View = "generate" | "saved" | "compare"

const VERDICT_TONE: Record<IdeaVerdict, BadgeTone> = {
  strong: "green",
  promising: "blue",
  uncertain: "amber",
  weak: "red",
}

function money(value: number, currency: string, locale: string) {
  return `${Math.round(value).toLocaleString(locale)} ${currency}`
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="tabular flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-primary/30 bg-accent/50 text-foreground"
      aria-label={`${score} / 100`}
    >
      <span className="text-base font-semibold leading-none">{Math.round(score)}</span>
      <span className="text-[9px] text-muted-foreground">/100</span>
    </div>
  )
}

function IdeaCard({
  idea,
  score,
  footer,
  onRate,
}: {
  idea: GeneratedIdea
  score: number
  footer?: React.ReactNode
  onRate?: (key: IdeaCriterionKey, rating: number) => void
}) {
  const { t, locale } = useI18n()
  const i = t.ideas
  const [open, setOpen] = React.useState(false)
  const verdict = ideaVerdict(score)

  return (
    <Panel as="article" className="flex flex-col">
      <div className="flex items-start gap-4 p-5">
        <ScoreRing score={score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{idea.title}</h3>
            <Badge tone={VERDICT_TONE[verdict]}>{i.verdicts[verdict]}</Badge>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{idea.summary}</p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 border-t border-border px-5 py-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">{i.problem}</dt>
          <dd className="mt-0.5 text-foreground">{idea.problem}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">{i.customers}</dt>
          <dd className="mt-0.5 text-foreground">{idea.customerSegments.join(" · ")}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {i.capital} <Badge tone="blue">{t.basis.estimate}</Badge>
          </dt>
          <dd className="tabular mt-0.5 font-medium text-foreground">
            {money(idea.startupCapital.low, idea.startupCapital.currency, locale)} –{" "}
            {money(idea.startupCapital.high, idea.startupCapital.currency, locale)}
          </dd>
          <dd className="mt-0.5 text-xs text-muted-foreground">{idea.startupCapital.assumptions}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">{i.complexity}</dt>
          <dd className="mt-0.5 text-foreground">{i.complexityLevels[idea.complexity]}</dd>
          <dt className="mt-2 text-xs font-medium text-muted-foreground">{i.revenue}</dt>
          <dd className="mt-0.5 text-foreground">{idea.revenueModel}</dd>
        </div>
      </dl>

      <div className="border-t border-border px-5 py-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {open ? i.hideDetails : i.showDetails}
        </button>
        {open && (
          <div className="mt-4 space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-foreground">{i.scoreTitle}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">{i.scoreExplainer}</p>
              <ul className="mt-3 space-y-3">
                {ideaScoreBreakdown(idea.ratings).map((row) => (
                  <li key={row.key} className="text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {i.criteria[row.key]}{" "}
                        <span className="font-normal text-muted-foreground">· {fmt(i.weight, { weight: row.weight })}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {onRate ? (
                          <select
                            aria-label={i.criteria[row.key]}
                            value={row.rating}
                            onChange={(event) => onRate(row.key, Number(event.target.value))}
                            className={`${inputClass} h-7 w-16 px-1.5 text-xs`}
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n}/5
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="tabular text-xs text-muted-foreground">{row.rating}/5</span>
                        )}
                        <span className="tabular w-14 text-right text-xs font-medium text-foreground">
                          {row.points} / {row.weight}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(row.points / row.weight) * 100}%` }} />
                    </div>
                    {row.reason && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.reason}</p>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold text-foreground">{i.risks}</h4>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {idea.risks.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">{i.firstSteps}</h4>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                  {idea.firstSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {footer && <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">{footer}</div>}
    </Panel>
  )
}

export function IdeaLab({
  initialSaved,
  defaultCountry,
  hasBusiness,
}: {
  initialSaved: SavedIdea[]
  defaultCountry: string
  hasBusiness: boolean
}) {
  const { t, locale } = useI18n()
  const i = t.ideas
  const router = useRouter()

  const [view, setView] = React.useState<View>("generate")
  const [mode, setMode] = React.useState<Mode>("skills")
  const [countryCode, setCountryCode] = React.useState(defaultCountry)
  const [city, setCity] = React.useState("")
  const [industry, setIndustry] = React.useState("")
  const [skills, setSkills] = React.useState("")
  const [academicField, setAcademicField] = React.useState("")
  const [localProblem, setLocalProblem] = React.useState("")
  const [budget, setBudget] = React.useState("")
  const [generating, setGenerating] = React.useState(false)
  const [results, setResults] = React.useState<Array<{ idea: GeneratedIdea; score: number; savedId?: string }>>([])
  const [resultContext, setResultContext] = React.useState({ countryCode: defaultCountry, industry: "" })
  const [saved, setSaved] = React.useState(initialSaved)
  const [selected, setSelected] = React.useState<string[]>([])
  const [converting, setConverting] = React.useState<SavedIdea | null>(null)
  const [businessName, setBusinessName] = React.useState("")
  const [businessCity, setBusinessCity] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const currency = getAfricanCountryCurrency(countryCode)

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault()
    if (generating) return
    setGenerating(true)
    try {
      const result = await generateIdeas({
        mode,
        countryCode,
        city,
        industry,
        skills,
        academicField,
        localProblem,
        budget: Number(budget) || 0,
      })
      if (!result.success) return void toast.error(result.error)
      setResults(result.ideas)
      setResultContext({ countryCode, industry })
    } catch {
      toast.error(t.common.errorGeneric)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave(index: number) {
    const entry = results[index]
    if (!entry || entry.savedId) return
    const result = await saveIdea({ idea: entry.idea, ...resultContext })
    if (!result.success) return void toast.error(result.error)
    setResults((list) => list.map((item, n) => (n === index ? { ...item, savedId: result.idea.id } : item)))
    setSaved((list) => [result.idea, ...list].sort((a, b) => b.score - a.score))
    toast.success(i.savedToast)
  }

  async function handleRate(idea: SavedIdea, key: IdeaCriterionKey, rating: number) {
    const ratings = { ...idea.idea.ratings, [key]: { ...idea.idea.ratings[key], rating } }
    const next = { ...idea, idea: { ...idea.idea, ratings }, score: computeIdeaScore(ratings) }
    setSaved((list) => list.map((item) => (item.id === idea.id ? next : item)))
    const result = await updateIdeaRatings(idea.id, ratings)
    if (!result.success) {
      setSaved((list) => list.map((item) => (item.id === idea.id ? idea : item)))
      toast.error(result.error)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return
    const result = await deleteIdea(id)
    if (!result.success) return void toast.error(result.error)
    setSaved((list) => list.filter((item) => item.id !== id))
    setSelected((list) => list.filter((item) => item !== id))
  }

  async function handleConvert(event: React.FormEvent) {
    event.preventDefault()
    if (!converting || busy) return
    setBusy(true)
    const result = await convertIdeaToBusiness({ ideaId: converting.id, name: businessName, city: businessCity })
    setBusy(false)
    if (!result.success) return void toast.error(result.error)
    toast.success(i.convertedToast)
    router.push("/dashboard")
    router.refresh()
  }

  function toggleSelected(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((item) => item !== id) : list.length < 4 ? [...list, id] : list))
  }

  const compared = saved.filter((idea) => selected.includes(idea.id))

  const modes: Array<{ id: Mode; label: string }> = [
    { id: "skills", label: i.modes.skills },
    { id: "academic", label: i.modes.academic },
    { id: "problem", label: i.modes.problem },
    { id: "market", label: i.modes.market },
  ]

  return (
    <div className="space-y-6">
      <Tabs<View>
        value={view}
        onChange={setView}
        label={t.pages.ideas.title}
        items={[
          { id: "generate", label: i.tabGenerate },
          { id: "saved", label: i.tabSaved, count: saved.length },
          { id: "compare", label: i.tabCompare, count: compared.length || undefined },
        ]}
      />

      {view === "generate" && (
        <>
          <Panel>
            <PanelHeader title={i.formTitle} description={i.formBody} />
            <form onSubmit={handleGenerate} className="space-y-5 p-5">
              <div role="radiogroup" aria-label={i.startFrom} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {modes.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={mode === option.id}
                    onClick={() => setMode(option.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition",
                      mode === option.id
                        ? "border-primary bg-accent/60 text-foreground ring-1 ring-primary"
                        : "border-border text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {mode === "skills" && (
                <Field label={i.skillsLabel} htmlFor="idea-skills">
                  <textarea id="idea-skills" required rows={2} maxLength={600} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={i.skillsPlaceholder} className={textareaClass} />
                </Field>
              )}
              {mode === "academic" && (
                <Field label={i.academicLabel} htmlFor="idea-academic">
                  <input id="idea-academic" required maxLength={200} value={academicField} onChange={(e) => setAcademicField(e.target.value)} placeholder={i.academicPlaceholder} className={inputClass} />
                </Field>
              )}
              {mode === "problem" && (
                <Field label={i.problemLabel} htmlFor="idea-problem">
                  <textarea id="idea-problem" required rows={3} maxLength={800} value={localProblem} onChange={(e) => setLocalProblem(e.target.value)} placeholder={i.problemPlaceholder} className={textareaClass} />
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={i.country} htmlFor="idea-country">
                  <select id="idea-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className={inputClass}>
                    {AFRICAN_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {formatAfricanCountryOption(country)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`${i.city} (${t.common.optional})`} htmlFor="idea-city">
                  <input id="idea-city" maxLength={120} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
                </Field>
                <Field label={mode === "market" ? i.industry : `${i.industry} (${t.common.optional})`} htmlFor="idea-industry">
                  <select id="idea-industry" required={mode === "market"} value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputClass}>
                    <option value="">{i.anyIndustry}</option>
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
                <Field label={fmt(i.budget, { currency })} htmlFor="idea-budget">
                  <input id="idea-budget" type="number" min={0} inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} className={inputClass} />
                </Field>
              </div>

              <button type="submit" disabled={generating} className={primaryButtonClass}>
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? t.common.generating : i.generate}
              </button>
            </form>
          </Panel>

          {results.length > 0 && (
            <>
              <Notice tone="info">{i.resultsNote}</Notice>
              <div className="grid gap-5 xl:grid-cols-2">
                {results.map((entry, index) => (
                  <IdeaCard
                    key={`${entry.idea.title}-${index}`}
                    idea={entry.idea}
                    score={entry.score}
                    footer={
                      <button type="button" disabled={Boolean(entry.savedId)} onClick={() => handleSave(index)} className={secondaryButtonClass}>
                        {entry.savedId ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
                        {entry.savedId ? t.common.saved : i.saveIdea}
                      </button>
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {view === "saved" &&
        (saved.length === 0 ? (
          <Panel>
            <EmptyState icon={Lightbulb} title={i.savedEmptyTitle} description={i.savedEmptyBody} />
          </Panel>
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-muted-foreground">{i.compareHint}</p>
            <div className="grid gap-5 xl:grid-cols-2">
              {saved.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea.idea}
                  score={idea.score}
                  onRate={(key, rating) => handleRate(idea, key, rating)}
                  footer={
                    <>
                      <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <input type="checkbox" checked={selected.includes(idea.id)} onChange={() => toggleSelected(idea.id)} className="size-4 accent-[var(--primary)]" />
                        {i.compare}
                      </label>
                      <span className="flex-1" />
                      {idea.status === "converted" ? (
                        <Badge tone="green">{i.converted}</Badge>
                      ) : (
                        <button
                          type="button"
                          className={primaryButtonClass}
                          onClick={() => {
                            setConverting(idea)
                            setBusinessName(idea.title.slice(0, 120))
                            setBusinessCity("")
                          }}
                        >
                          <Rocket className="size-4" /> {i.convert}
                        </button>
                      )}
                      <button type="button" aria-label={t.common.delete} onClick={() => handleDelete(idea.id)} className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600">
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  }
                />
              ))}
            </div>
            {selected.length >= 2 && (
              <button type="button" className={secondaryButtonClass} onClick={() => setView("compare")}>
                {fmt(i.compareSelected, { count: selected.length })} <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        ))}

      {view === "compare" &&
        (compared.length < 2 ? (
          <Panel>
            <EmptyState icon={Lightbulb} title={i.compareEmptyTitle} description={i.compareEmptyBody} />
          </Panel>
        ) : (
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="w-44 px-4 py-3 text-xs font-medium text-muted-foreground">
                    {i.criterion}
                  </th>
                  {compared.map((idea) => (
                    <th key={idea.id} scope="col" className="px-4 py-3 text-sm font-semibold text-foreground">
                      {idea.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0">
                <tr className="bg-muted/40">
                  <th scope="row" className="text-xs font-semibold text-foreground">
                    {i.totalScore}
                  </th>
                  {compared.map((idea) => {
                    const best = idea.score === Math.max(...compared.map((c) => c.score))
                    return (
                      <td key={idea.id} className={cn("tabular text-base font-semibold", best ? "text-primary" : "text-foreground")}>
                        {idea.score}
                      </td>
                    )
                  })}
                </tr>
                {IDEA_CRITERIA.map(({ key, weight }) => (
                  <tr key={key}>
                    <th scope="row" className="text-xs font-medium text-muted-foreground">
                      {i.criteria[key]} · {fmt(i.weight, { weight })}
                    </th>
                    {compared.map((idea) => (
                      <td key={idea.id} className="tabular text-foreground">
                        {idea.idea.ratings[key].rating}/5
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="text-xs font-medium text-muted-foreground">
                    {i.capital}
                  </th>
                  {compared.map((idea) => (
                    <td key={idea.id} className="tabular text-foreground">
                      {money(idea.idea.startupCapital.low, idea.idea.startupCapital.currency, locale)} –{" "}
                      {money(idea.idea.startupCapital.high, idea.idea.startupCapital.currency, locale)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="text-xs font-medium text-muted-foreground">
                    {i.complexity}
                  </th>
                  {compared.map((idea) => (
                    <td key={idea.id}>{i.complexityLevels[idea.idea.complexity]}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="text-xs font-medium text-muted-foreground">
                    {i.customers}
                  </th>
                  {compared.map((idea) => (
                    <td key={idea.id} className="text-muted-foreground">
                      {idea.idea.customerSegments.join(" · ")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="text-xs font-medium text-muted-foreground">
                    {i.risks}
                  </th>
                  {compared.map((idea) => (
                    <td key={idea.id} className="text-muted-foreground">
                      {idea.idea.risks[0]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Panel>
        ))}

      <Modal
        open={converting !== null}
        onClose={() => setConverting(null)}
        title={i.convertTitle}
        description={hasBusiness ? i.convertBodyExisting : i.convertBody}
        closeLabel={t.common.close}
        size="sm"
      >
        <form onSubmit={handleConvert} className="space-y-4">
          <Field label={i.businessName} htmlFor="convert-name">
            <input id="convert-name" required minLength={2} maxLength={120} value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
          </Field>
          <Field label={i.city} htmlFor="convert-city">
            <input id="convert-city" required maxLength={120} value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={secondaryButtonClass} onClick={() => setConverting(null)}>
              {t.common.cancel}
            </button>
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy && <Loader2 className="size-4 animate-spin" />} {i.createBusiness}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
