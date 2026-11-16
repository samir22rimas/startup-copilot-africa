"use client"

import { ClipboardList, Loader2, MessagesSquare, Pencil, Plus, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  deleteAssumption,
  deleteEvidence,
  saveAssumption,
  saveEvidence,
  type ValidationData,
} from "@/src/app/actions/validation"
import { ReportStudio, type ReportStudioProps } from "@/src/components/reports/ReportStudio"
import { Modal, Tabs } from "@/src/components/ui/overlay"
import {
  Badge,
  EmptyState,
  Field,
  Notice,
  Panel,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
  type BadgeTone,
} from "@/src/components/ui/page"
import type {
  AssumptionCategory,
  AssumptionRow,
  AssumptionStatus,
  EvidenceKind,
  EvidenceRow,
  EvidenceStance,
} from "@/src/lib/database.v2.types"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"

type Tab = "analyses" | "assumptions" | "evidence"

const CATEGORIES: AssumptionCategory[] = ["problem", "customer", "solution", "price", "channel", "market", "other"]
const STATUSES: AssumptionStatus[] = ["untested", "testing", "validated", "invalidated"]
const KINDS: EvidenceKind[] = ["interview", "survey", "feedback", "competitor", "experiment"]
const STANCES: EvidenceStance[] = ["supports", "contradicts", "neutral"]

const STATUS_TONE: Record<AssumptionStatus, BadgeTone> = {
  untested: "neutral",
  testing: "blue",
  validated: "green",
  invalidated: "red",
}
const STANCE_TONE: Record<EvidenceStance, BadgeTone> = { supports: "green", contradicts: "red", neutral: "neutral" }

type AssumptionDraft = { id?: string; statement: string; category: AssumptionCategory; importance: number; status: AssumptionStatus }
type EvidenceDraft = {
  id?: string
  kind: EvidenceKind
  title: string
  notes: string
  stance: EvidenceStance
  occurredOn: string
  assumptionId: string
  respondents: string
  source: string
}

function detail(row: EvidenceRow, key: string): string {
  const details = row.details && typeof row.details === "object" && !Array.isArray(row.details) ? row.details : {}
  const value = (details as Record<string, unknown>)[key]
  return typeof value === "string" ? value : ""
}

export function ValidationWorkspace({
  initial,
  studio,
  canEdit,
}: {
  initial: ValidationData
  studio: ReportStudioProps
  canEdit: boolean
}) {
  const { t, locale } = useI18n()
  const v = t.validation
  const [tab, setTab] = React.useState<Tab>("analyses")
  const [assumptions, setAssumptions] = React.useState(initial.assumptions)
  const [evidence, setEvidence] = React.useState(initial.evidence)
  const [assumptionDraft, setAssumptionDraft] = React.useState<AssumptionDraft | null>(null)
  const [evidenceDraft, setEvidenceDraft] = React.useState<EvidenceDraft | null>(null)
  const [kindFilter, setKindFilter] = React.useState<EvidenceKind | "all">("all")
  const [saving, setSaving] = React.useState(false)

  const validated = assumptions.filter((a) => a.status === "validated").length
  const evidenceByAssumption = React.useMemo(() => {
    const map = new Map<string, { supports: number; contradicts: number }>()
    for (const item of evidence) {
      if (!item.assumption_id) continue
      const entry = map.get(item.assumption_id) ?? { supports: 0, contradicts: 0 }
      if (item.stance === "supports") entry.supports += 1
      if (item.stance === "contradicts") entry.contradicts += 1
      map.set(item.assumption_id, entry)
    }
    return map
  }, [evidence])

  async function submitAssumption(event: React.FormEvent) {
    event.preventDefault()
    if (!assumptionDraft || saving) return
    setSaving(true)
    const { id, ...input } = assumptionDraft
    const result = await saveAssumption(input, id)
    setSaving(false)
    if (!result.success) return void toast.error(result.error)
    setAssumptions((list) =>
      id ? list.map((a) => (a.id === id ? result.assumption : a)) : [result.assumption, ...list],
    )
    setAssumptionDraft(null)
    toast.success(v.saved)
  }

  async function quickStatus(row: AssumptionRow, status: AssumptionStatus) {
    const previous = assumptions
    setAssumptions((list) => list.map((a) => (a.id === row.id ? { ...a, status } : a)))
    const result = await saveAssumption(
      { statement: row.statement, category: row.category, importance: row.importance, status },
      row.id,
    )
    if (!result.success) {
      setAssumptions(previous)
      toast.error(result.error)
    }
  }

  async function removeAssumption(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return
    const result = await deleteAssumption(id)
    if (!result.success) return void toast.error(result.error)
    setAssumptions((list) => list.filter((a) => a.id !== id))
    setEvidence((list) => list.map((e) => (e.assumption_id === id ? { ...e, assumption_id: null } : e)))
    toast.success(v.deleted)
  }

  async function submitEvidence(event: React.FormEvent) {
    event.preventDefault()
    if (!evidenceDraft || saving) return
    setSaving(true)
    const { id, respondents, source, occurredOn, assumptionId, ...rest } = evidenceDraft
    const details: Record<string, string> = {}
    if (respondents.trim()) details.respondents = respondents.trim()
    if (source.trim()) details.source = source.trim()
    const result = await saveEvidence(
      { ...rest, occurredOn: occurredOn || null, assumptionId: assumptionId || null, details },
      id,
    )
    setSaving(false)
    if (!result.success) return void toast.error(result.error)
    setEvidence((list) => (id ? list.map((e) => (e.id === id ? result.evidence : e)) : [result.evidence, ...list]))
    setEvidenceDraft(null)
    toast.success(v.saved)
  }

  async function removeEvidence(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return
    const result = await deleteEvidence(id)
    if (!result.success) return void toast.error(result.error)
    setEvidence((list) => list.filter((e) => e.id !== id))
    toast.success(v.deleted)
  }

  const newEvidence = (assumptionId = ""): EvidenceDraft => ({
    kind: "interview",
    title: "",
    notes: "",
    stance: "neutral",
    occurredOn: new Date().toISOString().slice(0, 10),
    assumptionId,
    respondents: "",
    source: "",
  })

  const visibleEvidence = kindFilter === "all" ? evidence : evidence.filter((e) => e.kind === kindFilter)

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <h2 className="text-sm font-semibold text-foreground">{v.progressTitle}</h2>
        {assumptions.length === 0 && evidence.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{v.progressEmpty}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {fmt(v.progressBody, { validated, total: assumptions.length, evidence: evidence.length })}
            </p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              {STATUSES.map((status) => {
                const count = assumptions.filter((a) => a.status === status).length
                if (!count) return null
                const color =
                  status === "validated"
                    ? "bg-emerald-500"
                    : status === "invalidated"
                      ? "bg-red-500"
                      : status === "testing"
                        ? "bg-sky-500"
                        : "bg-transparent"
                return <div key={status} className={color} style={{ width: `${(count / assumptions.length) * 100}%` }} />
              })}
            </div>
          </>
        )}
      </Panel>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        label={t.pages.validation.title}
        items={[
          { id: "analyses", label: v.tabAnalyses },
          { id: "assumptions", label: v.tabAssumptions, count: assumptions.length },
          { id: "evidence", label: v.tabEvidence, count: evidence.length },
        ]}
      />

      {tab === "analyses" && <ReportStudio {...studio} />}

      {tab === "assumptions" && (
        <Panel>
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">{v.assumptionLabel}</p>
            {canEdit && (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => setAssumptionDraft({ statement: "", category: "customer", importance: 2, status: "untested" })}
              >
                <Plus className="size-4" /> {v.addAssumption}
              </button>
            )}
          </div>
          {assumptions.length === 0 ? (
            <EmptyState icon={ClipboardList} title={v.assumptionsEmptyTitle} description={v.assumptionsEmptyBody} />
          ) : (
            <ul className="divide-y divide-border">
              {assumptions.map((row) => {
                const counts = evidenceByAssumption.get(row.id)
                return (
                  <li key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-relaxed text-foreground">{row.statement}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge>{v.categories[row.category]}</Badge>
                        <Badge tone={row.importance === 3 ? "amber" : "neutral"}>
                          {v.importanceLevels[row.importance as 1 | 2 | 3] ?? row.importance}
                        </Badge>
                        <span>
                          {counts ? fmt(v.evidenceFor, counts) : v.noEvidenceYet}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {canEdit ? (
                        <select
                          aria-label={v.status}
                          value={row.status}
                          onChange={(event) => quickStatus(row, event.target.value as AssumptionStatus)}
                          className={`${inputClass} h-8 w-auto text-xs`}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {v.statuses[status]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={STATUS_TONE[row.status]}>{v.statuses[row.status]}</Badge>
                      )}
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            title={v.addEvidence}
                            aria-label={v.addEvidence}
                            onClick={() => setEvidenceDraft(newEvidence(row.id))}
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Plus className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={t.common.edit}
                            onClick={() =>
                              setAssumptionDraft({
                                id: row.id,
                                statement: row.statement,
                                category: row.category,
                                importance: row.importance,
                                status: row.status,
                              })
                            }
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={t.common.delete}
                            onClick={() => removeAssumption(row.id)}
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}

      {tab === "evidence" && (
        <div className="space-y-4">
          <Notice tone="info">{v.truthNote}</Notice>
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <select
                aria-label={v.kind}
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value as EvidenceKind | "all")}
                className={`${inputClass} h-8 w-auto text-xs`}
              >
                <option value="all">{v.filterAll}</option>
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {v.kinds[kind]}
                  </option>
                ))}
              </select>
              {canEdit && (
                <button type="button" className={primaryButtonClass} onClick={() => setEvidenceDraft(newEvidence())}>
                  <Plus className="size-4" /> {v.addEvidence}
                </button>
              )}
            </div>
            {visibleEvidence.length === 0 ? (
              <EmptyState icon={MessagesSquare} title={v.evidenceEmptyTitle} description={v.evidenceEmptyBody} />
            ) : (
              <ul className="divide-y divide-border">
                {visibleEvidence.map((row) => {
                  const linked = assumptions.find((a) => a.id === row.assumption_id)
                  return (
                    <li key={row.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="brand">{v.kinds[row.kind]}</Badge>
                            <Badge tone={STANCE_TONE[row.stance]}>{v.stanceShort[row.stance]}</Badge>
                            {row.occurred_on && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(`${row.occurred_on}T00:00:00`).toLocaleDateString(locale, {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">{row.title}</p>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              aria-label={t.common.edit}
                              onClick={() =>
                                setEvidenceDraft({
                                  id: row.id,
                                  kind: row.kind,
                                  title: row.title,
                                  notes: row.notes,
                                  stance: row.stance,
                                  occurredOn: row.occurred_on ?? "",
                                  assumptionId: row.assumption_id ?? "",
                                  respondents: detail(row, "respondents"),
                                  source: detail(row, "source"),
                                })
                              }
                              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={t.common.delete}
                              onClick={() => removeEvidence(row.id)}
                              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {row.notes && (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{row.notes}</p>
                      )}
                      {linked && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {v.linkedAssumption}: <span className="text-foreground">{linked.statement}</span>
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <Modal
        open={assumptionDraft !== null}
        onClose={() => setAssumptionDraft(null)}
        title={assumptionDraft?.id ? v.editAssumption : v.addAssumption}
        closeLabel={t.common.close}
        size="md"
      >
        {assumptionDraft && (
          <form onSubmit={submitAssumption} className="space-y-4">
            <Field label={v.assumptionLabel} htmlFor="assumption-statement">
              <textarea
                id="assumption-statement"
                required
                rows={3}
                maxLength={500}
                value={assumptionDraft.statement}
                onChange={(e) => setAssumptionDraft({ ...assumptionDraft, statement: e.target.value })}
                placeholder={v.assumptionPlaceholder}
                className={textareaClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={v.category} htmlFor="assumption-category">
                <select
                  id="assumption-category"
                  value={assumptionDraft.category}
                  onChange={(e) => setAssumptionDraft({ ...assumptionDraft, category: e.target.value as AssumptionCategory })}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {v.categories[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={v.importance} htmlFor="assumption-importance">
                <select
                  id="assumption-importance"
                  value={assumptionDraft.importance}
                  onChange={(e) => setAssumptionDraft({ ...assumptionDraft, importance: Number(e.target.value) })}
                  className={inputClass}
                >
                  {[3, 2, 1].map((level) => (
                    <option key={level} value={level}>
                      {v.importanceLevels[level as 1 | 2 | 3]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={v.status} htmlFor="assumption-status">
                <select
                  id="assumption-status"
                  value={assumptionDraft.status}
                  onChange={(e) => setAssumptionDraft({ ...assumptionDraft, status: e.target.value as AssumptionStatus })}
                  className={inputClass}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {v.statuses[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setAssumptionDraft(null)}>
                {t.common.cancel}
              </button>
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                {saving && <Loader2 className="size-4 animate-spin" />} {t.common.save}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={evidenceDraft !== null}
        onClose={() => setEvidenceDraft(null)}
        title={evidenceDraft?.id ? v.editEvidence : v.addEvidence}
        description={v.truthNote}
        closeLabel={t.common.close}
        size="lg"
      >
        {evidenceDraft && (
          <form onSubmit={submitEvidence} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={v.kind} htmlFor="evidence-kind">
                <select
                  id="evidence-kind"
                  value={evidenceDraft.kind}
                  onChange={(e) => setEvidenceDraft({ ...evidenceDraft, kind: e.target.value as EvidenceKind })}
                  className={inputClass}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {v.kinds[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={v.dateLabel} htmlFor="evidence-date">
                <input
                  id="evidence-date"
                  type="date"
                  value={evidenceDraft.occurredOn}
                  onChange={(e) => setEvidenceDraft({ ...evidenceDraft, occurredOn: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label={evidenceDraft.kind === "survey" ? v.detailRespondents : v.detailSource} htmlFor="evidence-extra">
                {evidenceDraft.kind === "survey" ? (
                  <input
                    id="evidence-extra"
                    type="number"
                    min={0}
                    value={evidenceDraft.respondents}
                    onChange={(e) => setEvidenceDraft({ ...evidenceDraft, respondents: e.target.value })}
                    className={inputClass}
                  />
                ) : (
                  <input
                    id="evidence-extra"
                    maxLength={200}
                    value={evidenceDraft.source}
                    onChange={(e) => setEvidenceDraft({ ...evidenceDraft, source: e.target.value })}
                    className={inputClass}
                  />
                )}
              </Field>
            </div>
            <Field label={v.titleLabel} htmlFor="evidence-title">
              <input
                id="evidence-title"
                required
                maxLength={200}
                value={evidenceDraft.title}
                onChange={(e) => setEvidenceDraft({ ...evidenceDraft, title: e.target.value })}
                placeholder={v.titlePlaceholder}
                className={inputClass}
              />
            </Field>
            <Field label={v.notesLabel} htmlFor="evidence-notes">
              <textarea
                id="evidence-notes"
                rows={5}
                maxLength={8000}
                value={evidenceDraft.notes}
                onChange={(e) => setEvidenceDraft({ ...evidenceDraft, notes: e.target.value })}
                placeholder={v.notesPlaceholder}
                className={textareaClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={v.linkedAssumption} htmlFor="evidence-assumption">
                <select
                  id="evidence-assumption"
                  value={evidenceDraft.assumptionId}
                  onChange={(e) => setEvidenceDraft({ ...evidenceDraft, assumptionId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{v.noLinkedAssumption}</option>
                  {assumptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.statement.slice(0, 90)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={v.stanceLabel} htmlFor="evidence-stance">
                <select
                  id="evidence-stance"
                  value={evidenceDraft.stance}
                  onChange={(e) => setEvidenceDraft({ ...evidenceDraft, stance: e.target.value as EvidenceStance })}
                  className={inputClass}
                >
                  {STANCES.map((s) => (
                    <option key={s} value={s}>
                      {v.stances[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setEvidenceDraft(null)}>
                {t.common.cancel}
              </button>
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                {saving && <Loader2 className="size-4 animate-spin" />} {t.common.save}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
