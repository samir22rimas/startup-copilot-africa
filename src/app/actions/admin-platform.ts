"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"

import { ADMIN_NOT_AUTHORIZED, recordAdminAudit, requireAdminClient } from "@/src/lib/admin-guard"
import { getAfricanCountry } from "@/src/lib/african-countries"
import type { AuditLogRow, FeatureFlagRow, OpportunityRow } from "@/src/lib/database.v2.types"
import { FEATURES } from "@/src/lib/plans"
import { isUuid, safeHttpUrl } from "@/src/lib/validation"

type Result<T = Record<never, never>> = ({ success: true } & T) | { success: false; error: string }

function publicError(error: unknown, fallback: string): string {
  unstable_rethrow(error)
  if (error instanceof Error && error.message === ADMIN_NOT_AUTHORIZED) return ADMIN_NOT_AUTHORIZED
  console.error("[admin]", error)
  return fallback
}

// --- AI usage -----------------------------------------------------------------

export interface AiUsageStats {
  days: number
  calls: number
  failures: number
  promptTokens: number
  completionTokens: number
  /** Calls whose token counts were estimated because the provider did not report them. */
  estimatedCalls: number
  /** True when the sample hit the row cap and totals are a lower bound. */
  truncated: boolean
  byFeature: Array<{ feature: string; calls: number; tokens: number; failures: number }>
  byModel: Array<{ provider: string; model: string; calls: number; tokens: number }>
  byDay: Array<{ day: string; calls: number; tokens: number }>
  topUsers: Array<{ userId: string; email: string; calls: number; tokens: number }>
  recentErrors: Array<{ feature: string; error: string; createdAt: string }>
}

const USAGE_ROW_CAP = 20_000

/** Token consumption and reliability of AI calls, from the `ai_usage` ledger. */
export async function getAiUsageStats(days = 30): Promise<Result<{ stats: AiUsageStats }>> {
  try {
    const { supabase } = await requireAdminClient()
    const window = Math.min(90, Math.max(1, Math.round(days)))
    const since = new Date(Date.now() - window * 86_400_000).toISOString()

    const { data, error } = await supabase
      .from("ai_usage")
      .select("user_id, feature, provider, model, prompt_tokens, completion_tokens, tokens_reported, success, error, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(USAGE_ROW_CAP)
    if (error) return { success: false, error: "AI usage is not available. Apply the latest database migration." }

    const rows = data ?? []
    const features = new Map<string, { calls: number; tokens: number; failures: number }>()
    const models = new Map<string, { provider: string; model: string; calls: number; tokens: number }>()
    const daysMap = new Map<string, { calls: number; tokens: number }>()
    const users = new Map<string, { calls: number; tokens: number }>()
    let promptTokens = 0
    let completionTokens = 0
    let failures = 0
    let estimatedCalls = 0

    for (const row of rows) {
      const tokens = row.prompt_tokens + row.completion_tokens
      promptTokens += row.prompt_tokens
      completionTokens += row.completion_tokens
      if (!row.success) failures += 1
      if (!row.tokens_reported && row.success) estimatedCalls += 1

      // "plan.section.market_analysis" and "report.research.pricing" roll up to their first two parts.
      const feature = row.feature.split(".").slice(0, 2).join(".")
      const f = features.get(feature) ?? { calls: 0, tokens: 0, failures: 0 }
      f.calls += 1
      f.tokens += tokens
      if (!row.success) f.failures += 1
      features.set(feature, f)

      if (row.success) {
        const key = `${row.provider}:${row.model}`
        const m = models.get(key) ?? { provider: row.provider, model: row.model, calls: 0, tokens: 0 }
        m.calls += 1
        m.tokens += tokens
        models.set(key, m)
      }

      const day = row.created_at.slice(0, 10)
      const d = daysMap.get(day) ?? { calls: 0, tokens: 0 }
      d.calls += 1
      d.tokens += tokens
      daysMap.set(day, d)

      if (row.user_id) {
        const u = users.get(row.user_id) ?? { calls: 0, tokens: 0 }
        u.calls += 1
        u.tokens += tokens
        users.set(row.user_id, u)
      }
    }

    const top = [...users.entries()].sort((a, b) => b[1].tokens - a[1].tokens).slice(0, 10)
    const emails = new Map<string, string>()
    await Promise.all(
      top.map(async ([userId]) => {
        const { data: found } = await supabase.auth.admin.getUserById(userId)
        emails.set(userId, found?.user?.email ?? "")
      }),
    )

    return {
      success: true,
      stats: {
        days: window,
        calls: rows.length,
        failures,
        promptTokens,
        completionTokens,
        estimatedCalls,
        truncated: rows.length >= USAGE_ROW_CAP,
        byFeature: [...features.entries()].map(([feature, v]) => ({ feature, ...v })).sort((a, b) => b.tokens - a.tokens),
        byModel: [...models.values()].sort((a, b) => b.tokens - a.tokens),
        byDay: [...daysMap.entries()].map(([day, v]) => ({ day, ...v })).sort((a, b) => a.day.localeCompare(b.day)),
        topUsers: top.map(([userId, v]) => ({ userId, email: emails.get(userId) ?? "", ...v })),
        recentErrors: rows
          .filter((row) => !row.success && row.error)
          .slice(0, 15)
          .map((row) => ({ feature: row.feature, error: row.error as string, createdAt: row.created_at })),
      },
    }
  } catch (error) {
    return { success: false, error: publicError(error, "Failed to load AI usage.") }
  }
}

// --- Opportunities catalogue ----------------------------------------------------

const STAGES = ["idea", "validation", "mvp", "early_revenue", "growth", "scale"] as const

const opportunitySchema = z.object({
  title: z.string().trim().min(3, "Title is too short.").max(200),
  organization: z.string().trim().min(2, "Name the organiser.").max(200),
  type: z.enum(["competition", "incubator", "accelerator", "grant", "scholarship", "funding_program", "mentorship", "event", "challenge"]),
  description: z.string().trim().max(4000).default(""),
  countries: z.array(z.string().trim().toUpperCase()).max(60).default([]),
  industries: z.array(z.string().trim().max(80)).max(30).default([]),
  stages: z.array(z.enum(STAGES)).max(6).default([]),
  fundingType: z.enum(["grant", "equity", "debt", "prize", "non_financial", "mixed"]),
  amountText: z.string().trim().max(120).default(""),
  eligibility: z.string().trim().max(2000).default(""),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  isRolling: z.boolean().default(false),
  sourceUrl: z.string().trim().min(1, "The organiser's page is required."),
  sourceName: z.string().trim().max(120).default(""),
  /** The day an admin opened the source page and confirmed these details. */
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date you verified this."),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
})

export type OpportunityInput = z.input<typeof opportunitySchema>

export async function listAdminOpportunities(): Promise<Result<{ opportunities: OpportunityRow[] }>> {
  try {
    const { supabase } = await requireAdminClient()
    const { data, error } = await supabase.from("opportunities").select("*").order("updated_at", { ascending: false }).limit(1000)
    if (error) return { success: false, error: "Opportunities are not available. Apply the latest database migration." }
    return { success: true, opportunities: data ?? [] }
  } catch (error) {
    return { success: false, error: publicError(error, "Failed to load opportunities.") }
  }
}

export async function saveAdminOpportunity(input: OpportunityInput, id?: string): Promise<Result<{ opportunity: OpportunityRow }>> {
  try {
    const { supabase, admin } = await requireAdminClient()
    const parsed = opportunitySchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details." }
    const data = parsed.data

    const url = safeHttpUrl(data.sourceUrl)
    if (!url || !url.startsWith("https://")) return { success: false, error: "The source must be an https:// link to the organiser's page." }
    const today = new Date().toISOString().slice(0, 10)
    if (data.lastVerifiedAt > today) return { success: false, error: "The verification date cannot be in the future." }
    if (data.countries.some((code) => !getAfricanCountry(code))) return { success: false, error: "One of the countries is not recognised." }
    if (data.status === "published" && !data.isRolling && data.deadline && data.deadline < today) {
      return { success: false, error: "The deadline has passed. Archive it or correct the date." }
    }

    const row = {
      title: data.title,
      organization: data.organization,
      type: data.type,
      description: data.description,
      countries: data.countries,
      industries: data.industries,
      stages: data.stages as string[],
      funding_type: data.fundingType,
      amount_text: data.amountText || null,
      eligibility: data.eligibility,
      deadline: data.isRolling ? null : data.deadline || null,
      is_rolling: data.isRolling,
      source_url: url,
      source_name: data.sourceName || null,
      last_verified_at: data.lastVerifiedAt,
      verified_by: admin.id,
      status: data.status,
    }

    if (id && !isUuid(id)) return { success: false, error: "That opportunity is not available." }
    const query = id ? supabase.from("opportunities").update(row).eq("id", id) : supabase.from("opportunities").insert(row)
    const { data: saved, error } = await query.select("*").maybeSingle()
    if (error || !saved) return { success: false, error: "Could not save the opportunity." }

    await recordAdminAudit(admin, id ? "opportunity.update" : "opportunity.create", { type: "opportunity", id: saved.id }, { title: saved.title, status: saved.status })
    revalidatePath("/admin/opportunities")
    revalidatePath("/dashboard/opportunities")
    return { success: true, opportunity: saved }
  } catch (error) {
    return { success: false, error: publicError(error, "Failed to save the opportunity.") }
  }
}

export async function deleteAdminOpportunity(id: string): Promise<Result> {
  try {
    const { supabase, admin } = await requireAdminClient()
    if (!isUuid(id)) return { success: false, error: "That opportunity is not available." }
    const { error } = await supabase.from("opportunities").delete().eq("id", id)
    if (error) return { success: false, error: "Could not delete the opportunity." }
    await recordAdminAudit(admin, "opportunity.delete", { type: "opportunity", id })
    revalidatePath("/admin/opportunities")
    revalidatePath("/dashboard/opportunities")
    return { success: true }
  } catch (error) {
    return { success: false, error: publicError(error, "Failed to delete the opportunity.") }
  }
}

// --- Feature switches -----------------------------------------------------------

export interface FeatureSwitch {
  key: string
  enabled: boolean
  updatedAt: string | null
}

/** One switch per plan feature; a feature with no stored row is on. */
export async function listFeatureSwitches(): Promise<Result<{ switches: FeatureSwitch[] }>> {
  try {
    const { supabase } = await requireAdminClient()
    const { data, error } = await supabase.from("feature_flags").select("key, enabled, updated_at")
    if (error) return { success: false, error: "Feature switches are not available. Apply the latest database migration." }
    const stored = new Map((data ?? []).map((row: Pick<FeatureFlagRow, "key" | "enabled" | "updated_at">) => [row.key, row]))
    return {
      success: true,
      switches: FEATURES.map((key) => ({ key, enabled: stored.get(key)?.enabled ?? true, updatedAt: stored.get(key)?.updated_at ?? null })),
    }
  } catch (error) {
    return { success: false, error: publicError(error, "Failed to load feature switches.") }
  }
}

export async function setFeatureSwitch(key: string, enabled: boolean): Promise<Result> {
  try {
    const { supabase, admin } = await requireAdminClient()
    if (!(FEATURES as readonly string[]).includes(key)) return { success: false, error: "Unknown feature." }
    const { error } = await supabase
      .from("feature_flags")
      .upsert({ key, enabled: Boolean(enabled), updated_by: admin.id, updated_at: new Date().toISOString() }, { onConflict: "key" })
    if (error) return { success: false, error: "Could not update the feature." }
    await recordAdminAudit(admin, "feature.toggle", { type: "feature", id: key }, { enabled: Boolean(enabled) })
    revalidatePath("/admin/features")
    revalidatePath("/dashboard", "layout")
    return { success: true }
  } catch (error) {
    return { success: false, error: publicError(error, "Failed to update the feature.") }
  }
}

// --- Audit trail ----------------------------------------------------------------

export async function getAuditLogs(): Promise<Result<{ logs: AuditLogRow[] }>> {
  try {
    const { supabase } = await requireAdminClient()
    const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)
    if (error) return { success: false, error: "The audit trail is not available. Apply the latest database migration." }
    return { success: true, logs: data ?? [] }
  } catch (error) {
    return { success: false, error: publicError(error, "Failed to load the audit trail.") }
  }
}
