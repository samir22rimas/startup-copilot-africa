"use client"

import { Check, Copy, FileText, Link2, Loader2, Pencil, Save, Sparkles, Wand2, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  createPlanShareLink,
  listPlanVersions,
  restorePlanVersion,
  revokePlanShareLink,
  savePlanSection,
  savePlanVersion,
  writePlanSection,
  type PlanShareLink,
  type PlanState,
} from "@/src/app/actions/business-plan"
import { ExportMenu } from "@/src/components/shared/ExportMenu"
import { Markdown } from "@/src/components/shared/Markdown"
import { VersionHistory } from "@/src/components/shared/VersionHistory"
import { Modal } from "@/src/components/ui/overlay"
import {
  Badge,
  EmptyState,
  Notice,
  Panel,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "@/src/components/ui/page"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { MAX_SECTION_LENGTH, PLAN_GENERATION_ORDER, PLAN_SECTIONS, planCompletion, type PlanSectionKey } from "@/src/lib/plan"
import { cn } from "@/src/lib/utils"

export function PlanEditor({
  initial,
  initialShare,
  startupName,
  canEdit,
  canShare,
}: {
  initial: PlanState
  initialShare: PlanShareLink | null
  startupName: string
  canEdit: boolean
  canShare: boolean
}) {
  const { t, locale } = useI18n()
  const p = t.plan
  const [plan, setPlan] = React.useState(initial)
  const [active, setActive] = React.useState<PlanSectionKey>("executive_summary")
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [instruction, setInstruction] = React.useState("")
  const [writing, setWriting] = React.useState<PlanSectionKey | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [batch, setBatch] = React.useState<{ done: number; total: number } | null>(null)
  const cancelBatch = React.useRef(false)
  const [shareOpen, setShareOpen] = React.useState(false)
  const [share, setShare] = React.useState(initialShare)
  const [shareBusy, setShareBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const section = plan.sections[active]
  const completion = planCompletion(plan.sections)
  const busy = writing !== null || saving || batch !== null

  function select(key: PlanSectionKey) {
    if (editing && draft !== (section?.markdown ?? "") && !window.confirm(p.discardConfirm)) return
    setActive(key)
    setEditing(false)
    setInstruction("")
  }

  async function write(key: PlanSectionKey, withInstruction?: string) {
    setWriting(key)
    try {
      const result = await writePlanSection({ section: key, instruction: withInstruction })
      if (!result.success) {
        toast.error(result.error)
        return false
      }
      setPlan(result.plan)
      return true
    } catch {
      toast.error(t.common.errorGeneric)
      return false
    } finally {
      setWriting(null)
    }
  }

  async function handleWrite() {
    if (section && !instruction.trim() && !window.confirm(p.regenerateConfirm)) return
    setEditing(false)
    if (await write(active, instruction.trim() || undefined)) setInstruction("")
  }

  async function handleWriteAll() {
    const missing = PLAN_GENERATION_ORDER.filter((key) => !plan.sections[key])
    if (!missing.length) return
    if (!window.confirm(fmt(p.writeAllConfirm, { count: missing.length }))) return
    cancelBatch.current = false
    setBatch({ done: 0, total: missing.length })
    for (let index = 0; index < missing.length; index++) {
      if (cancelBatch.current) break
      setActive(missing[index])
      const ok = await write(missing[index])
      if (!ok) break
      setBatch({ done: index + 1, total: missing.length })
    }
    setBatch(null)
  }

  async function handleSaveEdit() {
    setSaving(true)
    const result = await savePlanSection({ section: active, markdown: draft })
    setSaving(false)
    if (!result.success) return void toast.error(result.error)
    setPlan(result.plan)
    setEditing(false)
    toast.success(t.common.saved)
  }

  async function handleSaveVersion() {
    const note = window.prompt(t.model.versionPrompt, "")
    if (note === null) return
    const result = await savePlanVersion(note)
    if (!result.success) return void toast.error(result.error)
    setPlan(result.plan)
    toast.success(fmt(t.common.versionN, { n: result.plan.version }))
  }

  async function handleRestore(versionId: string) {
    const result = await restorePlanVersion(versionId)
    if (!result.success) {
      toast.error(result.error)
      return false
    }
    setPlan(result.plan)
    setEditing(false)
    return true
  }

  async function exportPlan(format: "pdf" | "docx") {
    const { exportReport } = await import("@/src/lib/export")
    await exportReport(
      format,
      {
        startupName,
        title: t.pages.plan.title,
        generatedAt: plan.updatedAt ?? new Date().toISOString(),
        sections: PLAN_SECTIONS.filter((key) => plan.sections[key]).map((key) => ({
          heading: p.sections[key],
          markdown: plan.sections[key]!.markdown,
        })),
      },
      "business-plan",
    )
  }

  async function handleCreateShare() {
    setShareBusy(true)
    const result = await createPlanShareLink()
    setShareBusy(false)
    if (!result.success) return void toast.error(result.error)
    setShare(result.link)
  }

  async function handleRevokeShare() {
    if (!share) return
    setShareBusy(true)
    const result = await revokePlanShareLink(share.id)
    setShareBusy(false)
    if (!result.success) return void toast.error(result.error)
    setShare(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(completion.written / completion.total) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{fmt(p.completion, completion)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && completion.written < completion.total && (
            <button type="button" onClick={handleWriteAll} disabled={busy} className={primaryButtonClass}>
              <Wand2 className="size-4" /> {p.writeAll}
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={handleSaveVersion} disabled={busy || !plan.id} className={secondaryButtonClass}>
              <Save className="size-4" /> {t.common.saveVersion}
            </button>
          )}
          <VersionHistory load={listPlanVersions} onRestore={handleRestore} canRestore={canEdit} />
          {canEdit && (
            <button type="button" onClick={() => setShareOpen(true)} disabled={!plan.id} className={secondaryButtonClass}>
              <Link2 className="size-4" /> {t.common.share}
            </button>
          )}
          {completion.written > 0 && (
            <ExportMenu
              label={t.common.download}
              className={secondaryButtonClass}
              options={[
                { id: "pdf", label: t.common.pdf, hint: t.common.pdfHint, run: () => exportPlan("pdf") },
                { id: "docx", label: t.common.docx, hint: t.common.docxHint, run: () => exportPlan("docx") },
              ]}
            />
          )}
        </div>
      </div>

      {batch && (
        <Notice tone="info" title={fmt(p.batchProgress, batch)}>
          <button
            type="button"
            className="font-medium underline underline-offset-4"
            onClick={() => {
              cancelBatch.current = true
            }}
          >
            {p.batchStop}
          </button>
        </Notice>
      )}

      {!canEdit && <Notice tone="locked">{t.common.readOnly}</Notice>}

      <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
        <Panel as="aside" className="h-fit p-2 lg:sticky lg:top-0">
          <nav aria-label={t.pages.plan.title}>
            <ol className="space-y-0.5">
              {PLAN_SECTIONS.map((key, index) => {
                const written = Boolean(plan.sections[key])
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => select(key)}
                      aria-current={key === active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition",
                        key === active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "tabular flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                          written ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
                        )}
                      >
                        {writing === key ? <Loader2 className="size-3 animate-spin" /> : written ? <Check className="size-3" /> : index + 1}
                      </span>
                      <span className="truncate">{p.sections[key]}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
        </Panel>

        <Panel className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{p.sections[active]}</h2>
              {section && (
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone={section.source === "edited" ? "brand" : "neutral"}>
                    {section.source === "edited" ? p.sourceEdited : p.sourceAi}
                  </Badge>
                  {section.updatedAt &&
                    fmt(t.common.updated, {
                      date: new Date(section.updatedAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
                    })}
                </p>
              )}
            </div>
            {canEdit && section && !editing && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDraft(section.markdown)
                  setEditing(true)
                }}
                className={secondaryButtonClass}
              >
                <Pencil className="size-4" /> {t.common.edit}
              </button>
            )}
          </div>

          <div className="p-5">
            {writing === active ? (
              <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {p.writing}
              </div>
            ) : editing ? (
              <div className="space-y-3">
                <textarea
                  aria-label={p.sections[active]}
                  rows={18}
                  maxLength={MAX_SECTION_LENGTH}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className={cn(textareaClass, "font-mono text-[13px]")}
                />
                <p className="text-xs text-muted-foreground">{p.markdownHint}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveEdit} disabled={saving} className={primaryButtonClass}>
                    {saving && <Loader2 className="size-4 animate-spin" />} {t.common.save}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className={secondaryButtonClass}>
                    <X className="size-4" /> {t.common.cancel}
                  </button>
                </div>
              </div>
            ) : section ? (
              <Markdown content={section.markdown} />
            ) : (
              <EmptyState icon={FileText} title={p.emptyTitle} description={canEdit ? p.emptyBody : undefined} className="py-10" />
            )}
          </div>

          {canEdit && !editing && writing !== active && (
            <div className="space-y-3 border-t border-border px-5 py-4">
              <label htmlFor="plan-instruction" className="block text-xs font-medium text-foreground">
                {section ? p.improveLabel : p.guideLabel}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="plan-instruction"
                  value={instruction}
                  maxLength={600}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder={section ? p.improvePlaceholder : p.guidePlaceholder}
                  className={inputClass}
                />
                <button type="button" onClick={handleWrite} disabled={busy} className={cn(primaryButtonClass, "shrink-0")}>
                  <Sparkles className="size-4" />
                  {!section ? p.write : instruction.trim() ? p.improve : t.common.regenerate}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{p.consistencyNote}</p>
            </div>
          )}
        </Panel>
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={p.shareTitle} description={p.shareBody} closeLabel={t.common.close} size="md">
        {!canShare ? (
          <Notice tone="locked">{p.shareLocked}</Notice>
        ) : share ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input readOnly aria-label={p.shareTitle} value={share.url} onFocus={(event) => event.target.select()} className={inputClass} />
              <button
                type="button"
                className={cn(secondaryButtonClass, "shrink-0")}
                onClick={async () => {
                  await navigator.clipboard.writeText(share.url)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1800)
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t.common.copied : t.common.copy}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {fmt(p.shareExpires, {
                date: new Date(share.expiresAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }),
              })}
            </p>
            <button type="button" onClick={handleRevokeShare} disabled={shareBusy} className={cn(secondaryButtonClass, "text-red-600 dark:text-red-400")}>
              {shareBusy && <Loader2 className="size-4 animate-spin" />} {p.shareRevoke}
            </button>
          </div>
        ) : (
          <button type="button" onClick={handleCreateShare} disabled={shareBusy} className={primaryButtonClass}>
            {shareBusy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} {p.shareCreate}
          </button>
        )}
      </Modal>
    </div>
  )
}
