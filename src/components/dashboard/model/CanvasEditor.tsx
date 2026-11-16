"use client"

import { Check, ClipboardCheck, Loader2, Plus, Save, Sparkles, Wand2, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  draftCanvas,
  getCanvas,
  listCanvasVersions,
  restoreCanvasVersion,
  reviewCanvas,
  saveCanvas,
  suggestForBlock,
  type CanvasState,
} from "@/src/app/actions/canvas"
import { ExportMenu } from "@/src/components/shared/ExportMenu"
import { VersionHistory } from "@/src/components/shared/VersionHistory"
import { Modal, Tabs } from "@/src/components/ui/overlay"
import { Notice, ghostButtonClass, primaryButtonClass, secondaryButtonClass } from "@/src/components/ui/page"
import {
  CANVAS_BLOCKS,
  CANVAS_LAYOUT,
  MAX_ITEMS_PER_BLOCK,
  MAX_ITEM_LENGTH,
  canvasCompletion,
  type CanvasBlockKey,
  type CanvasBlocks,
  type CanvasKind,
  type CanvasReview,
} from "@/src/lib/canvas"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { cn } from "@/src/lib/utils"

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error"

function hasContent(blocks: CanvasBlocks) {
  return Object.values(blocks).some((items) => items.length > 0)
}

export function CanvasEditor({
  initial,
  startupName,
  canEdit,
}: {
  initial: Record<CanvasKind, CanvasState>
  startupName: string
  canEdit: boolean
}) {
  const { t } = useI18n()
  const m = t.model
  const [kind, setKind] = React.useState<CanvasKind>("bmc")
  const [canvases, setCanvases] = React.useState(initial)
  const [saveState, setSaveState] = React.useState<SaveState>("idle")
  const [drafting, setDrafting] = React.useState(false)
  const [reviewing, setReviewing] = React.useState(false)
  const [review, setReview] = React.useState<CanvasReview | null>(null)
  const [suggesting, setSuggesting] = React.useState<CanvasBlockKey | null>(null)
  const [suggestions, setSuggestions] = React.useState<Partial<Record<CanvasBlockKey, string[]>>>({})
  const [drafts, setDrafts] = React.useState<Partial<Record<CanvasBlockKey, string>>>({})

  const blocks = canvases[kind].blocks
  const completion = canvasCompletion(kind, blocks)

  // Autosave: the latest blocks per canvas are written a moment after typing stops.
  const pending = React.useRef<Partial<Record<CanvasKind, CanvasBlocks>>>({})
  const timer = React.useRef<number | null>(null)

  const flush = React.useCallback(async () => {
    const work = pending.current
    pending.current = {}
    const entries = Object.entries(work) as Array<[CanvasKind, CanvasBlocks]>
    if (!entries.length) return
    setSaveState("saving")
    let failed = false
    for (const [key, value] of entries) {
      const result = await saveCanvas({ kind: key, blocks: value })
      if (!result.success) {
        failed = true
        toast.error(result.error)
      } else {
        setCanvases((current) => ({
          ...current,
          [key]: { ...current[key], id: result.canvas.id, updatedAt: result.canvas.updatedAt, version: result.canvas.version },
        }))
      }
    }
    setSaveState(failed ? "error" : Object.keys(pending.current).length ? "dirty" : "saved")
  }, [])

  const update = React.useCallback(
    (target: CanvasKind, next: CanvasBlocks) => {
      setCanvases((current) => ({ ...current, [target]: { ...current[target], blocks: next } }))
      if (!canEdit) return
      pending.current[target] = next
      setSaveState("dirty")
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, 1200)
    },
    [canEdit, flush],
  )

  React.useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      if (timer.current) window.clearTimeout(timer.current)
      void flush()
    }
  }, [flush])

  function setItems(block: CanvasBlockKey, items: string[]) {
    update(kind, { ...blocks, [block]: items.slice(0, MAX_ITEMS_PER_BLOCK) })
  }

  function addItem(block: CanvasBlockKey, value: string) {
    const text = value.replace(/\s+/g, " ").trim().slice(0, MAX_ITEM_LENGTH)
    if (!text || (blocks[block]?.length ?? 0) >= MAX_ITEMS_PER_BLOCK) return
    setItems(block, [...(blocks[block] ?? []), text])
  }

  async function handleSuggest(block: CanvasBlockKey) {
    setSuggesting(block)
    try {
      const result = await suggestForBlock({ kind, block, blocks })
      if (!result.success) return void toast.error(result.error)
      setSuggestions((current) => ({ ...current, [block]: result.suggestions }))
    } finally {
      setSuggesting(null)
    }
  }

  async function handleDraft() {
    if (hasContent(blocks) && !window.confirm(m.draftConfirm)) return
    setDrafting(true)
    try {
      const result = await draftCanvas(kind)
      if (!result.success) return void toast.error(result.error)
      update(kind, result.blocks)
      toast.success(m.draftReady)
    } finally {
      setDrafting(false)
    }
  }

  async function handleReview() {
    setReviewing(true)
    try {
      const result = await reviewCanvas({ kind, blocks })
      if (!result.success) return void toast.error(result.error)
      setReview(result.review)
    } finally {
      setReviewing(false)
    }
  }

  async function handleSaveVersion() {
    const note = window.prompt(m.versionPrompt, "")
    if (note === null) return
    if (timer.current) window.clearTimeout(timer.current)
    pending.current = {}
    setSaveState("saving")
    const result = await saveCanvas({ kind, blocks, versionNote: note })
    if (!result.success) {
      setSaveState("error")
      return void toast.error(result.error)
    }
    setCanvases((current) => ({ ...current, [kind]: result.canvas }))
    setSaveState("saved")
    toast.success(fmt(t.common.versionN, { n: result.canvas.version }))
  }

  async function handleRestore(versionId: string) {
    const result = await restoreCanvasVersion(versionId)
    if (!result.success) {
      toast.error(result.error)
      return false
    }
    setCanvases((current) => ({ ...current, [result.canvas.kind]: result.canvas }))
    return true
  }

  async function exportPdf(format: "pdf" | "docx") {
    const { exportReport } = await import("@/src/lib/export")
    await exportReport(
      format,
      {
        startupName,
        title: m.kinds[kind],
        generatedAt: canvases[kind].updatedAt ?? new Date().toISOString(),
        sections: CANVAS_BLOCKS[kind].map((key) => ({
          heading: m.blocks[key].label,
          markdown: blocks[key]?.length ? blocks[key].map((item) => `- ${item}`).join("\n") : `_${m.emptyBlock}_`,
        })),
      },
      m.kinds[kind],
    )
  }

  async function switchKind(next: CanvasKind) {
    setKind(next)
    setReview(null)
    // Pick up edits a teammate may have made since the page loaded.
    if (!pending.current[next]) {
      const fresh = await getCanvas(next)
      if (fresh && !pending.current[next]) setCanvases((current) => ({ ...current, [next]: fresh }))
    }
  }

  const statusLabel: Record<SaveState, string> = {
    idle: "",
    dirty: m.unsaved,
    saving: t.common.saving,
    saved: m.allSaved,
    error: m.saveFailed,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<CanvasKind>
          value={kind}
          onChange={switchKind}
          label={t.pages.model.title}
          className="border-0"
          items={[
            { id: "bmc", label: m.kinds.bmc },
            { id: "lean", label: m.kinds.lean },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-live="polite"
            className={cn("flex items-center gap-1.5 text-xs", saveState === "error" ? "text-red-600" : "text-muted-foreground")}
          >
            {saveState === "saving" && <Loader2 className="size-3.5 animate-spin" />}
            {saveState === "saved" && <Check className="size-3.5 text-primary" />}
            {statusLabel[saveState]}
          </span>
          {canEdit && (
            <>
              <button type="button" onClick={handleDraft} disabled={drafting} className={secondaryButtonClass}>
                {drafting ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} {m.draft}
              </button>
              <button type="button" onClick={handleReview} disabled={reviewing || !hasContent(blocks)} className={secondaryButtonClass}>
                {reviewing ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />} {m.review}
              </button>
              <button type="button" onClick={handleSaveVersion} disabled={!hasContent(blocks)} className={secondaryButtonClass}>
                <Save className="size-4" /> {t.common.saveVersion}
              </button>
            </>
          )}
          <VersionHistory load={() => listCanvasVersions(kind)} onRestore={handleRestore} canRestore={canEdit} />
          <ExportMenu
            label={t.common.download}
            className={secondaryButtonClass}
            options={[
              { id: "pdf", label: t.common.pdf, hint: t.common.pdfHint, run: () => exportPdf("pdf") },
              { id: "docx", label: t.common.docx, hint: t.common.docxHint, run: () => exportPdf("docx") },
            ]}
          />
        </div>
      </div>

      {!canEdit && <Notice tone="locked">{t.common.readOnly}</Notice>}

      <p className="text-xs text-muted-foreground">
        {m.kindHints[kind]} · {fmt(m.completion, completion)}
      </p>

      <div className="grid gap-3 lg:grid-cols-10 lg:grid-rows-[repeat(2,minmax(11rem,auto))_auto]">
        {CANVAS_LAYOUT[kind].map(({ key, className }) => {
          const items = blocks[key] ?? []
          const blockSuggestions = suggestions[key] ?? []
          const text = m.blocks[key]
          return (
            <section
              key={key}
              aria-labelledby={`canvas-${key}`}
              className={cn("flex min-h-40 flex-col rounded-xl border border-border bg-card p-3.5", className)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 id={`canvas-${key}`} className="text-[13px] font-semibold text-foreground">
                    {text.label}
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{text.hint}</p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleSuggest(key)}
                    disabled={suggesting !== null}
                    title={m.suggest}
                    aria-label={`${m.suggest}: ${text.label}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-primary transition hover:bg-accent disabled:opacity-50"
                  >
                    {suggesting === key ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  </button>
                )}
              </div>

              <ul className="mt-3 flex-1 space-y-1.5">
                {items.map((item, index) => (
                  <li key={index} className="group flex items-start gap-1 rounded-md bg-muted/60 px-2 py-1.5">
                    {canEdit ? (
                      <textarea
                        aria-label={`${text.label} ${index + 1}`}
                        rows={1}
                        value={item}
                        maxLength={MAX_ITEM_LENGTH}
                        onChange={(event) => {
                          const next = [...items]
                          next[index] = event.target.value
                          setCanvases((current) => ({
                            ...current,
                            [kind]: { ...current[kind], blocks: { ...blocks, [key]: next } },
                          }))
                        }}
                        onBlur={(event) => {
                          const value = event.target.value.replace(/\s+/g, " ").trim()
                          const next = [...items]
                          if (value) next[index] = value
                          else next.splice(index, 1)
                          setItems(key, next)
                        }}
                        className="min-h-5 flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none [field-sizing:content]"
                      />
                    ) : (
                      <span className="flex-1 text-xs leading-relaxed text-foreground">{item}</span>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        aria-label={`${t.common.remove}: ${item.slice(0, 40)}`}
                        onClick={() => setItems(key, items.filter((_, i) => i !== index))}
                        className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 transition hover:text-red-600 group-hover:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </li>
                ))}
                {items.length === 0 && !canEdit && <li className="text-xs text-muted-foreground">{m.emptyBlock}</li>}
              </ul>

              {blockSuggestions.length > 0 && (
                <div className="mt-2 space-y-1 rounded-md border border-dashed border-primary/40 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{m.suggestions}</p>
                  {blockSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        addItem(key, suggestion)
                        setSuggestions((current) => ({
                          ...current,
                          [key]: (current[key] ?? []).filter((_, i) => i !== index),
                        }))
                      }}
                      className="flex w-full items-start gap-1.5 rounded px-1 py-1 text-left text-xs leading-relaxed text-foreground transition hover:bg-accent"
                    >
                      <Plus className="mt-0.5 size-3 shrink-0 text-primary" /> {suggestion}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSuggestions((current) => ({ ...current, [key]: [] }))}
                    className={cn(ghostButtonClass, "h-6 px-1 text-[11px]")}
                  >
                    {m.dismiss}
                  </button>
                </div>
              )}

              {canEdit && items.length < MAX_ITEMS_PER_BLOCK && (
                <form
                  className="mt-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    addItem(key, drafts[key] ?? "")
                    setDrafts((current) => ({ ...current, [key]: "" }))
                  }}
                >
                  <input
                    aria-label={`${t.common.add}: ${text.label}`}
                    value={drafts[key] ?? ""}
                    maxLength={MAX_ITEM_LENGTH}
                    onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder={m.addPlaceholder}
                    className="h-7 w-full rounded-md border border-dashed border-input bg-transparent px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring"
                  />
                </form>
              )}
            </section>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">{t.common.aiNotice}</p>

      <Modal open={review !== null} onClose={() => setReview(null)} title={m.reviewTitle} closeLabel={t.common.close} size="lg">
        {review && (
          <div className="space-y-5 text-sm">
            <p className="leading-relaxed text-foreground">{review.verdict}</p>
            {review.strengths.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.strengths}</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground">
                  {review.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {review.gaps.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.gaps}</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-foreground">
                  {review.gaps.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {review.improvements.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.improvements}</h3>
                <ul className="mt-2 space-y-2">
                  {review.improvements.map((item, index) => (
                    <li key={index} className="rounded-lg bg-muted/60 px-3 py-2">
                      <span className="text-xs font-semibold text-primary">{item.block}</span>
                      <p className="mt-0.5 text-foreground">{item.suggestion}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t.common.aiNotice}</p>
            <div className="flex justify-end">
              <button type="button" className={primaryButtonClass} onClick={() => setReview(null)}>
                {t.common.done}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
