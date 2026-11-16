"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { AssumptionRow, EvidenceRow } from "@/src/lib/database.v2.types"
import { isUuid } from "@/src/lib/validation"
import { fail, requireWorkspace, type ActionResult } from "@/src/lib/workspace"
import { logActivity } from "@/src/lib/workspace/activity"

const PATH = "/dashboard/validation"

const assumptionSchema = z.object({
  statement: z.string().trim().min(3, "Write the assumption in a sentence.").max(500),
  category: z.enum(["problem", "customer", "solution", "price", "channel", "market", "other"]),
  importance: z.number().int().min(1).max(3),
  status: z.enum(["untested", "testing", "validated", "invalidated"]).default("untested"),
})

const evidenceSchema = z.object({
  kind: z.enum(["interview", "survey", "feedback", "competitor", "experiment"]),
  title: z.string().trim().min(2, "Give this entry a short title.").max(200),
  notes: z.string().trim().max(8000).default(""),
  stance: z.enum(["supports", "contradicts", "neutral"]),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  assumptionId: z.string().nullable().optional(),
  /** Free-form extras per kind: respondents, price heard, source link... */
  details: z.record(z.string().max(40), z.string().max(300)).default({}),
})

export type AssumptionInput = z.input<typeof assumptionSchema>
export type EvidenceInput = z.input<typeof evidenceSchema>

export interface ValidationData {
  assumptions: AssumptionRow[]
  evidence: EvidenceRow[]
}

export async function getValidationData(): Promise<ValidationData> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return { assumptions: [], evidence: [] }
  const [{ data: assumptions }, { data: evidence }] = await Promise.all([
    ws.supabase
      .from("validation_assumptions")
      .select("*")
      .eq("startup_id", ws.startup.id)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
    ws.supabase
      .from("validation_evidence")
      .select("*")
      .eq("startup_id", ws.startup.id)
      .order("created_at", { ascending: false })
      .limit(300),
  ])
  return { assumptions: assumptions ?? [], evidence: evidence ?? [] }
}

export async function saveAssumption(
  input: AssumptionInput,
  id?: string,
): Promise<ActionResult<{ assumption: AssumptionRow }>> {
  const parsed = assumptionSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details and try again.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  if (id) {
    if (!isUuid(id)) return fail("That assumption is not available.")
    const { data, error } = await ws.supabase
      .from("validation_assumptions")
      .update(parsed.data)
      .eq("id", id)
      .eq("startup_id", ws.startup.id)
      .select("*")
      .maybeSingle()
    if (error || !data) return fail("Could not save the assumption. Please try again.")
    revalidatePath(PATH)
    return { success: true, assumption: data }
  }

  const { data, error } = await ws.supabase
    .from("validation_assumptions")
    .insert({ ...parsed.data, startup_id: ws.startup.id, created_by: ws.user.id })
    .select("*")
    .maybeSingle()
  if (error || !data) return fail("Could not save the assumption. Please try again.")
  await logActivity(ws, {
    action: "assumption.added",
    entityType: "assumption",
    entityId: data.id,
    summary: `Added assumption: ${data.statement}`,
  })
  revalidatePath(PATH)
  return { success: true, assumption: data }
}

export async function deleteAssumption(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("That assumption is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const { error, count } = await ws.supabase
    .from("validation_assumptions")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not delete the assumption.")
  revalidatePath(PATH)
  return { success: true }
}

export async function saveEvidence(input: EvidenceInput, id?: string): Promise<ActionResult<{ evidence: EvidenceRow }>> {
  const parsed = evidenceSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details and try again.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const { assumptionId, occurredOn, ...rest } = parsed.data
  if (assumptionId && !isUuid(assumptionId)) return fail("That assumption is not available.")
  const row = {
    ...rest,
    occurred_on: occurredOn || null,
    assumption_id: assumptionId || null,
  }

  if (id) {
    if (!isUuid(id)) return fail("That entry is not available.")
    const { data, error } = await ws.supabase
      .from("validation_evidence")
      .update(row)
      .eq("id", id)
      .eq("startup_id", ws.startup.id)
      .select("*")
      .maybeSingle()
    if (error || !data) return fail("Could not save the entry. Please try again.")
    revalidatePath(PATH)
    return { success: true, evidence: data }
  }

  const { data, error } = await ws.supabase
    .from("validation_evidence")
    .insert({ ...row, startup_id: ws.startup.id, created_by: ws.user.id })
    .select("*")
    .maybeSingle()
  if (error || !data) return fail("Could not save the entry. Please try again.")
  await logActivity(ws, {
    action: "evidence.added",
    entityType: "evidence",
    entityId: data.id,
    summary: `Recorded ${data.kind}: ${data.title}`,
  })
  revalidatePath(PATH)
  revalidatePath("/dashboard")
  return { success: true, evidence: data }
}

export async function deleteEvidence(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("That entry is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const { error, count } = await ws.supabase
    .from("validation_evidence")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not delete the entry.")
  revalidatePath(PATH)
  return { success: true }
}
