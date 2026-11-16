"use client"

import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { deleteAdminOpportunity, saveAdminOpportunity, type OpportunityInput } from "@/src/app/actions/admin-platform"
import { Modal } from "@/src/components/ui/overlay"
import { Badge, Field, Notice, Panel, inputClass, primaryButtonClass, secondaryButtonClass, textareaClass } from "@/src/components/ui/page"
import { AFRICAN_COUNTRIES } from "@/src/lib/african-countries"
import type { OpportunityRow } from "@/src/lib/database.v2.types"

const TYPES = ["grant", "funding_program", "accelerator", "incubator", "competition", "challenge", "mentorship", "scholarship", "event"] as const
const FUNDING = ["grant", "equity", "debt", "prize", "non_financial", "mixed"] as const
const STAGES = ["idea", "validation", "mvp", "early_revenue", "growth", "scale"] as const
const STATUSES = ["draft", "published", "archived"] as const

type Draft = OpportunityInput & { id?: string }

const today = () => new Date().toISOString().slice(0, 10)

function emptyDraft(): Draft {
  return {
    title: "",
    organization: "",
    type: "grant",
    description: "",
    countries: [],
    industries: [],
    stages: [],
    fundingType: "grant",
    amountText: "",
    eligibility: "",
    deadline: null,
    isRolling: false,
    sourceUrl: "",
    sourceName: "",
    lastVerifiedAt: today(),
    status: "draft",
  }
}

function toDraft(row: OpportunityRow): Draft {
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    type: row.type,
    description: row.description,
    countries: row.countries,
    industries: row.industries,
    stages: row.stages as Draft["stages"],
    fundingType: row.funding_type,
    amountText: row.amount_text ?? "",
    eligibility: row.eligibility,
    deadline: row.deadline,
    isRolling: row.is_rolling,
    sourceUrl: row.source_url,
    sourceName: row.source_name ?? "",
    lastVerifiedAt: row.last_verified_at,
    status: row.status,
  }
}

/** Curates the verified opportunities shown to founders. */
export function OpportunityManager({ initial }: { initial: OpportunityRow[] }) {
  const [rows, setRows] = React.useState(initial)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [saving, setSaving] = React.useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft || saving) return
    setSaving(true)
    const { id, ...input } = draft
    const result = await saveAdminOpportunity(input, id)
    setSaving(false)
    if (!result.success) return void toast.error(result.error)
    setRows((list) => (id ? list.map((row) => (row.id === id ? result.opportunity : row)) : [result.opportunity, ...list]))
    setDraft(null)
    toast.success("Opportunity saved")
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this opportunity? Founders tracking it will lose it.")) return
    const result = await deleteAdminOpportunity(id)
    if (!result.success) return void toast.error(result.error)
    setRows((list) => list.filter((row) => row.id !== id))
  }

  const toggle = <T extends string>(list: T[] | undefined, value: T): T[] =>
    (list ?? []).includes(value) ? (list ?? []).filter((item) => item !== value) : [...(list ?? []), value]

  return (
    <div className="space-y-5">
      <Notice tone="warning" title="Publishing rule">
        Publish only what you have checked yourself on the organiser&apos;s own website today: name, eligibility, amount
        and deadline. Set &ldquo;Verified on&rdquo; to the date you checked. Never copy a listing from an aggregator or
        from an AI answer without opening the source.
      </Notice>

      <div className="flex justify-end">
        <button type="button" className={primaryButtonClass} onClick={() => setDraft(emptyDraft())}>
          <Plus className="size-4" /> Add opportunity
        </button>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">Opportunity</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Deadline</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Verified</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No opportunities yet. Founders see an honest empty state until you publish verified ones.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{row.title}</p>
                  <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {row.organization} <ExternalLink className="size-3" />
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.type.replace("_", " ")}</td>
                <td className="tabular px-4 py-3 text-muted-foreground">{row.is_rolling ? "Rolling" : (row.deadline ?? "—")}</td>
                <td className="tabular px-4 py-3 text-muted-foreground">{row.last_verified_at}</td>
                <td className="px-4 py-3">
                  <Badge tone={row.status === "published" ? "green" : row.status === "draft" ? "amber" : "neutral"}>{row.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" aria-label="Edit" onClick={() => setDraft(toDraft(row))} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" aria-label="Delete" onClick={() => remove(row.id)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Edit opportunity" : "Add opportunity"} size="lg">
        {draft && (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="opp-title">
                <input id="opp-title" required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Organiser" htmlFor="opp-org">
                <input id="opp-org" required maxLength={200} value={draft.organization} onChange={(e) => setDraft({ ...draft, organization: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Type" htmlFor="opp-type">
                <select id="opp-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })} className={inputClass}>
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Funding type" htmlFor="opp-funding">
                <select id="opp-funding" value={draft.fundingType} onChange={(e) => setDraft({ ...draft, fundingType: e.target.value as Draft["fundingType"] })} className={inputClass}>
                  {FUNDING.map((type) => (
                    <option key={type} value={type}>
                      {type.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description" htmlFor="opp-description">
              <textarea id="opp-description" rows={3} maxLength={4000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={textareaClass} />
            </Field>
            <Field label="Eligibility" htmlFor="opp-eligibility">
              <textarea id="opp-eligibility" rows={2} maxLength={2000} value={draft.eligibility} onChange={(e) => setDraft({ ...draft, eligibility: e.target.value })} className={textareaClass} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Amount (as stated by the organiser)" htmlFor="opp-amount">
                <input id="opp-amount" maxLength={120} value={draft.amountText} onChange={(e) => setDraft({ ...draft, amountText: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Deadline" htmlFor="opp-deadline">
                <input id="opp-deadline" type="date" disabled={draft.isRolling} value={draft.deadline ?? ""} onChange={(e) => setDraft({ ...draft, deadline: e.target.value || null })} className={inputClass} />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
                <input type="checkbox" checked={Boolean(draft.isRolling)} onChange={(e) => setDraft({ ...draft, isRolling: e.target.checked })} className="size-4" />
                Rolling applications
              </label>
            </div>

            <Field label="Countries" hint="Leave empty for programmes open across Africa. Hold Ctrl or Cmd to select several." htmlFor="opp-countries">
              <select
                id="opp-countries"
                multiple
                size={5}
                value={draft.countries ?? []}
                onChange={(e) => setDraft({ ...draft, countries: Array.from(e.target.selectedOptions, (option) => option.value) })}
                className={`${inputClass} h-auto py-1`}
              >
                {AFRICAN_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-foreground">Business stages (none = any stage)</legend>
              <div className="flex flex-wrap gap-3">
                {STAGES.map((stage) => (
                  <label key={stage} className="flex items-center gap-1.5 text-sm text-foreground">
                    <input type="checkbox" checked={(draft.stages ?? []).includes(stage)} onChange={() => setDraft({ ...draft, stages: toggle(draft.stages, stage) })} className="size-4" />
                    {stage.replace("_", " ")}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organiser's page (https)" htmlFor="opp-url">
                <input id="opp-url" type="url" required placeholder="https://" value={draft.sourceUrl} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Source name" htmlFor="opp-source">
                <input id="opp-source" maxLength={120} value={draft.sourceName} onChange={(e) => setDraft({ ...draft, sourceName: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Verified on" hint="The day you checked the organiser's page." htmlFor="opp-verified">
                <input id="opp-verified" type="date" required max={today()} value={draft.lastVerifiedAt} onChange={(e) => setDraft({ ...draft, lastVerifiedAt: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Status" htmlFor="opp-status">
                <select id="opp-status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })} className={inputClass}>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                {saving && <Loader2 className="size-4 animate-spin" />} Save
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
