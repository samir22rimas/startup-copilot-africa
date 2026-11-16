import { AlertTriangle, ArrowRight, Bot, CalendarDays, CheckCircle2, ChevronDown, Flag, Sparkles } from "lucide-react"
import Link from "next/link"

import type { OverviewData } from "@/src/app/actions/overview"
import { Badge, EmptyState, Panel, PanelHeader, primaryButtonClass, secondaryButtonClass, type BadgeTone } from "@/src/components/ui/page"
import { getAfricanCountryName } from "@/src/lib/african-countries"
import type { Database } from "@/src/lib/database.types"
import { isOverdue, todayIso } from "@/src/lib/execution"
import { formatMoney } from "@/src/lib/finance/currency"
import { healthBand, type HealthBand } from "@/src/lib/health/score"
import { fmt } from "@/src/lib/i18n/config"
import { getI18n } from "@/src/lib/i18n/server"
import { cn } from "@/src/lib/utils"

type StartupRow = Database["public"]["Tables"]["startups"]["Row"]

const BAND_TONE: Record<HealthBand, BadgeTone> = { strong: "green", steady: "blue", attention: "amber", early: "neutral" }

function ScoreBar({ score }: { score: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      {score !== null && <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />}
    </div>
  )
}

/** The business at a glance: explainable health, next actions, work in hand, risks and activity. */
export async function OverviewDashboard({ startup, data }: { startup: StartupRow; data: OverviewData }) {
  const { t, locale } = await getI18n()
  const o = t.overview
  const today = todayIso()
  const { health } = data
  const band = health.overall === null ? null : healthBand(health.overall)
  const date = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge tone="brand">{t.stages[startup.stage]}</Badge>
            <span>
              {startup.city ? `${startup.city}, ` : ""}
              {getAfricanCountryName(startup.country_code)}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">{startup.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/profile" className={secondaryButtonClass}>
            {t.onboarding.profileLink}
          </Link>
          <Link href="/dashboard/copilot" className={primaryButtonClass}>
            <Bot className="size-4" /> {o.askCopilot}
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel>
          <PanelHeader title={o.healthTitle} description={o.healthBody} />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-4">
              <div className="tabular flex size-20 flex-col items-center justify-center rounded-full border-4 border-primary/25 bg-accent/40">
                <span className="text-2xl font-semibold text-foreground">{health.overall ?? "—"}</span>
                {health.overall !== null && <span className="text-[10px] text-muted-foreground">/100</span>}
              </div>
              <div className="sm:hidden">{band && <Badge tone={BAND_TONE[band]}>{o.bands[band]}</Badge>}</div>
            </div>
            <div className="min-w-0">
              <div className="hidden sm:block">{band && <Badge tone={BAND_TONE[band]}>{o.bands[band]}</Badge>}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {health.overall === null ? o.healthInsufficient : fmt(o.healthMeasured, { count: health.measured, total: health.dimensions.length })}
              </p>
            </div>
          </div>

          <ul className="divide-y divide-border border-t border-border">
            {health.dimensions.map((dimension) => (
              <li key={dimension.key}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-3.5 transition hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{o.dimensions[dimension.key].label}</span>
                        <span className="tabular text-sm font-semibold text-foreground">
                          {dimension.score === null ? <span className="text-xs font-normal text-muted-foreground">{o.noData}</span> : dimension.score}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ScoreBar score={dimension.score} />
                      </div>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="space-y-3 bg-muted/30 px-5 py-4">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {dimension.score === null ? o.dimensions[dimension.key].empty : o.dimensions[dimension.key].description}
                    </p>
                    {dimension.score !== null && (
                      <ul className="space-y-1.5">
                        {dimension.signals.map((signal) => (
                          <li key={signal.key} className="flex items-start justify-between gap-4 text-xs">
                            <span className="text-foreground">{fmt(o.signals[signal.key], signal.values)}</span>
                            <span className="tabular shrink-0 text-muted-foreground">
                              {signal.earned} / {signal.max}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">{o.healthFootnote}</p>
        </Panel>

        <Panel className="h-fit">
          <PanelHeader title={o.recommendedTitle} description={fmt(o.recommendedBody, { stage: t.stages[startup.stage] })} />
          {data.recommendations.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={o.recommendedEmpty} className="py-8" />
          ) : (
            <ol className="divide-y divide-border">
              {data.recommendations.map((item, index) => (
                <li key={item.key}>
                  <Link href={item.href} className="group flex items-start gap-3 px-5 py-3.5 transition hover:bg-muted/40">
                    <span className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{fmt(o.recommendations[item.key].title, item.values)}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{fmt(o.recommendations[item.key].body, item.values)}</span>
                    </span>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title={o.tasksTitle}
            description={data.openTaskCount ? fmt(o.tasksOpen, { count: data.openTaskCount }) : undefined}
            actions={
              <Link href="/dashboard/projects" className="text-xs font-medium text-primary hover:underline">
                {t.common.viewAll}
              </Link>
            }
          />
          {data.tasks.length === 0 ? (
            <EmptyState icon={Sparkles} title={o.tasksEmptyTitle} description={o.tasksEmptyBody} className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {data.tasks.map((task) => {
                const late = isOverdue(task, today)
                return (
                  <li key={task.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className={cn("size-2 shrink-0 rounded-full", task.status === "blocked" ? "bg-red-500" : task.status === "in_progress" ? "bg-sky-500" : "bg-muted-foreground/40")}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.projects.statuses[task.status]}
                        {task.assignee_id && data.members[task.assignee_id] ? ` · ${data.members[task.assignee_id]}` : ""}
                      </p>
                    </div>
                    {task.due_date && (
                      <Badge tone={late ? "red" : "neutral"}>
                        <CalendarDays className="size-3" /> {date(task.due_date)}
                      </Badge>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={o.milestonesTitle} />
          {data.milestones.length === 0 ? (
            <EmptyState icon={Flag} title={o.milestonesEmptyTitle} description={o.milestonesEmptyBody} className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {data.milestones.map((milestone) => {
                const late = Boolean(milestone.due_date && milestone.due_date < today)
                return (
                  <li key={milestone.id} className="flex items-center gap-3 px-5 py-3">
                    <Flag className={cn("size-4 shrink-0", late ? "text-red-500" : "text-primary")} aria-hidden="true" />
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">{milestone.title}</p>
                    {milestone.due_date ? (
                      <Badge tone={late ? "red" : "neutral"}>
                        {date(milestone.due_date)}
                        {late ? ` · ${t.projects.late}` : ""}
                      </Badge>
                    ) : (
                      <Badge>{t.projects.milestoneStatuses[milestone.status]}</Badge>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={o.risksTitle} description={o.risksBody} />
          {data.risks.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={o.risksEmpty} className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {data.risks.map((risk, index) => (
                <li key={index} className="flex items-start gap-3 px-5 py-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {risk.kind === "recorded" ? risk.text : fmt(o.risks[risk.kind], { count: risk.count })}
                    </p>
                    {(risk.kind === "overdue" || risk.kind === "blocked") && risk.text && (
                      <p className="truncate text-xs text-muted-foreground">{risk.text}</p>
                    )}
                    {risk.kind === "funding" && data.finance && (
                      <p className="tabular text-xs text-muted-foreground">
                        {formatMoney(data.finance.fundingRequired, data.finance.currency, locale)} · {o.projectionNote}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title={o.activityTitle} />
          {data.activity.length === 0 ? (
            <EmptyState icon={Sparkles} title={o.activityEmpty} className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {data.activity.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-sm text-foreground">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.actor_id && data.members[entry.actor_id] ? `${data.members[entry.actor_id]} · ` : ""}
                    {new Date(entry.created_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
