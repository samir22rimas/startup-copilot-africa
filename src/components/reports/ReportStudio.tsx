"use client"

import { ArrowLeft, FileSearch, Loader2, Sparkles, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  deleteReport,
  generateReport,
  getReport,
  type ReportListItem,
  type SavedReport,
} from "@/src/app/actions/reports"
import { ReportView } from "@/src/components/reports/ReportView"
import {
  Badge,
  EmptyState,
  Field,
  Notice,
  Panel,
  PanelHeader,
  ghostButtonClass,
  primaryButtonClass,
  textareaClass,
} from "@/src/components/ui/page"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import type { ReportModule } from "@/src/lib/reports/catalog"
import { cn } from "@/src/lib/utils"

type KindKey = keyof ReturnType<typeof useI18n>["t"]["reports"]["kinds"]

export interface ReportStudioProps {
  module: ReportModule
  kinds: string[]
  initialReports: ReportListItem[]
  startupName: string
  canEdit: boolean
  /** Why live web sources are not used here, if they are not. */
  webNotice?: { kind: "locked"; plan: string } | { kind: "unavailable" } | null
}

/** Pick a topic, generate a structured analysis, browse the saved ones. */
export function ReportStudio({ module, kinds, initialReports, startupName, canEdit, webNotice }: ReportStudioProps) {
  const { t, locale } = useI18n()
  const [reports, setReports] = React.useState(initialReports)
  const [kind, setKind] = React.useState(kinds[0])
  const [focus, setFocus] = React.useState("")
  const [generating, setGenerating] = React.useState(false)
  const [opening, setOpening] = React.useState<string | null>(null)
  const [current, setCurrent] = React.useState<SavedReport | null>(null)
  const topRef = React.useRef<HTMLDivElement>(null)

  const kindText = (key: string) => t.reports.kinds[key as KindKey] ?? { label: key, description: "" }

  function show(report: SavedReport | null) {
    setCurrent(report)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start" }))
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault()
    if (generating) return
    setGenerating(true)
    try {
      const result = await generateReport({ module, kind, focus })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      const { report } = result
      setReports((list) => [
        { id: report.id, kind: report.kind, title: report.title, grounded: report.meta.grounded, updatedAt: report.updatedAt },
        ...list,
      ])
      setFocus("")
      toast.success(t.reports.generated)
      show(report)
    } catch {
      toast.error(t.common.errorGeneric)
    } finally {
      setGenerating(false)
    }
  }

  async function handleOpen(id: string) {
    setOpening(id)
    try {
      const report = await getReport(id)
      if (report) show(report)
      else toast.error(t.common.errorGeneric)
    } finally {
      setOpening(null)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t.reports.deleteConfirm)) return
    const result = await deleteReport(id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setReports((list) => list.filter((item) => item.id !== id))
    if (current?.id === id) setCurrent(null)
    toast.success(t.reports.deleted)
  }

  if (current) {
    return (
      <div ref={topRef} className="scroll-mt-4 space-y-4">
        <button type="button" onClick={() => show(null)} className={ghostButtonClass}>
          <ArrowLeft className="size-3.5" /> {t.reports.backToList}
        </button>
        <ReportView
          report={current.report}
          meta={current.meta}
          startupName={startupName}
          actions={
            canEdit ? (
              <button
                type="button"
                onClick={() => handleDelete(current.id)}
                className={cn(ghostButtonClass, "h-9 text-red-600 hover:text-red-700 dark:text-red-400")}
              >
                <Trash2 className="size-3.5" /> {t.common.delete}
              </button>
            ) : null
          }
        />
      </div>
    )
  }

  return (
    <div ref={topRef} className="space-y-6">
      {canEdit ? (
        <Panel>
          <PanelHeader title={t.reports.newAnalysis} description={t.reports.chooseType} />
          <form onSubmit={handleGenerate} className="space-y-5 p-5">
            <div role="radiogroup" aria-label={t.reports.chooseType} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {kinds.map((key) => {
                const selected = key === kind
                const text = kindText(key)
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setKind(key)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition",
                      selected ? "border-primary bg-accent/60 ring-1 ring-primary" : "border-border hover:bg-muted/60",
                    )}
                  >
                    <span className="block text-sm font-medium text-foreground">{text.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{text.description}</span>
                  </button>
                )
              })}
            </div>

            <Field label={t.reports.focusLabel} hint={t.reports.focusHint} htmlFor="report-focus">
              <textarea
                id="report-focus"
                rows={2}
                maxLength={600}
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                placeholder={t.reports.focusPlaceholder}
                className={textareaClass}
              />
            </Field>

            {webNotice && (
              <p className="text-xs text-muted-foreground">
                {webNotice.kind === "locked"
                  ? fmt(t.reports.webLockedHint, { plan: webNotice.plan })
                  : t.reports.webUnavailableHint}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={generating} className={primaryButtonClass}>
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? t.common.generating : t.reports.generate}
              </button>
              {generating && <span className="text-xs text-muted-foreground">{t.reports.generating}</span>}
            </div>
          </form>
        </Panel>
      ) : (
        <Notice tone="locked">{t.common.readOnly}</Notice>
      )}

      <Panel>
        <PanelHeader title={t.reports.saved} />
        {reports.length === 0 ? (
          <EmptyState icon={FileSearch} title={t.reports.savedEmptyTitle} description={t.reports.savedEmptyBody} />
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <button
                  type="button"
                  onClick={() => handleOpen(item.id)}
                  disabled={opening !== null}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium text-foreground hover:underline">
                    {item.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{kindText(item.kind).label}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(item.updatedAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                    {item.grounded && <Badge tone="green">{t.reports.withSources}</Badge>}
                  </span>
                </button>
                {opening === item.id && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label={t.common.delete}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
