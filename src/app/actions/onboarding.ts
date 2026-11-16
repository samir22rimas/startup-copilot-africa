"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { runAiStructured } from "@/src/lib/ai/service"
import type { Json, StartupStage } from "@/src/lib/database.types"
import { REPORT_SHAPE, parseReport, readReportMeta, reportSchema, type Report, type ReportMeta } from "@/src/lib/reports/schema"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { isUuid } from "@/src/lib/validation"
import { fail, requireWorkspace, type ActionResult } from "@/src/lib/workspace"
import { getLatestArtifact, saveArtifact } from "@/src/lib/workspace/artifacts"

const STAGES = ["idea", "validation", "mvp", "early_revenue", "growth", "scale"] as const
const EXPERIENCE = ["first_time", "some_experience", "experienced", "serial"] as const

const detailsSchema = z.object({
  startupId: z.string(),
  stage: z.enum(STAGES),
  experienceLevel: z.enum(EXPERIENCE),
  description: z.string().trim().max(2000).default(""),
  objectives: z.array(z.string().trim().min(2).max(200)).max(6).default([]),
})

export type OnboardingDetails = z.input<typeof detailsSchema>

/**
 * Second half of creating a business: its stage, description and objectives,
 * and the founder's own experience. Kept separate from creation so a business
 * is never lost if these extras cannot be saved (for example before the 2.0
 * migration has added the columns).
 */
export async function saveOnboardingDetails(input: OnboardingDetails): Promise<ActionResult> {
  const parsed = detailsSchema.safeParse(input)
  if (!parsed.success || !isUuid(parsed.data.startupId)) return fail("Check the details and try again.")
  const data = parsed.data

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("Please sign in to continue.")

  // Stage and description exist in every schema version.
  const { error: baseError } = await supabase
    .from("startups")
    .update({ stage: data.stage as StartupStage, description: data.description || null })
    .eq("id", data.startupId)
    .eq("owner_id", user.id)
  if (baseError) return fail("Your business was created, but its details could not be saved. Add them in Settings.")

  // 2.0 columns: ignored quietly when the migration is not applied yet.
  await supabase.from("startups").update({ objectives: data.objectives as Json }).eq("id", data.startupId).eq("owner_id", user.id)
  await supabase
    .from("profiles")
    .update({ experience_level: data.experienceLevel, onboarded_at: new Date().toISOString() })
    .eq("id", user.id)

  revalidatePath("/dashboard", "layout")
  return { success: true }
}

export interface EntrepreneurProfile {
  report: Report
  meta: ReportMeta
  updatedAt: string
}

export async function getEntrepreneurProfile(): Promise<EntrepreneurProfile | null> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return null
  const artifact = await getLatestArtifact(ws, "onboarding", "entrepreneur_profile")
  const report = artifact ? parseReport(artifact.content) : null
  return artifact && report ? { report, meta: readReportMeta(artifact.meta), updatedAt: artifact.updated_at } : null
}

/**
 * Builds the founder's starting profile from the onboarding interview: what
 * they bring, where the gaps are, and the most useful next steps in Anza.
 */
export async function generateEntrepreneurProfile(): Promise<ActionResult<{ profile: EntrepreneurProfile }>> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const { data: conversation } = await ws.supabase
    .from("conversations")
    .select("id")
    .eq("startup_id", ws.startup.id)
    .eq("kind", "interview")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let transcript = ""
  if (conversation) {
    const { data: messages } = await ws.supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(60)
    transcript = (messages ?? [])
      .map((m) => `${m.role === "assistant" ? "Interviewer" : "Founder"}: ${m.content.slice(0, 1500)}`)
      .join("\n")
  }
  if (transcript.length < 80) return fail("Complete the onboarding interview first, so the profile reflects your own answers.")

  const { data: profile } = await ws.supabase.from("profiles").select("experience_level").eq("id", ws.user.id).maybeSingle()
  const context = await buildBusinessContext(ws, [])

  const result = await runAiStructured({
    feature: "onboarding.profile",
    caller: ws.caller,
    system: baseSystemPrompt({
      role: "an entrepreneurship coach",
      locale: ws.locale,
      extra: `Write the founder's initial entrepreneurial profile from their onboarding interview.
Sections, in this order:
1. "What you bring" — strengths, skills and advantages the founder actually mentioned.
2. "Your business at a glance" — the idea, customer and model as they described it.
3. "Gaps to close" — skills, knowledge or resources that are missing or were not addressed.
4. "Riskiest assumptions" — what they are taking for granted that has not been tested.
5. "Your first 30 days" — a short sequence of concrete steps.
Mark as "verified" only what the founder explicitly said in the interview; your own inferences are "assumption".
In "nextSteps", give 4 to 6 actions and name the Anza area to use for each, chosen from: Business Validation, Market Research, Business Model, Business Plan, Financial Planning, Projects & Tasks, Marketing Studio, Idea Lab. Adapt the order to their stage (${ws.startup.stage}) and experience (${profile?.experience_level ?? "not stated"}): a first-time founder at idea stage starts with validation, not with a business plan.
Be encouraging but honest. Address the founder as "you".`,
    }),
    messages: [{ role: "user", content: `${context}\n\nOnboarding interview transcript:\n${fence("founder_input", transcript, 12_000)}` }],
    schema: reportSchema,
    shape: REPORT_SHAPE,
    maxTokens: 3000,
    temperature: 0.4,
  })
  if (!result.ok) return fail(result.error)

  const meta: ReportMeta = {
    grounded: false,
    sources: [],
    generatedAt: new Date().toISOString(),
    model: result.model,
    locale: ws.locale,
  }
  const existing = await getLatestArtifact(ws, "onboarding", "entrepreneur_profile")
  const saved = await saveArtifact(ws, {
    id: existing?.id,
    module: "onboarding",
    kind: "entrepreneur_profile",
    title: result.data.title,
    content: result.data,
    meta: meta as unknown as Record<string, unknown>,
  })
  if ("error" in saved) return fail(saved.error)

  // A compact copy on the person's own profile, for future personalisation.
  await ws.supabase
    .from("profiles")
    .update({ entrepreneur_profile: { summary: result.data.summary, generatedAt: meta.generatedAt, startupId: ws.startup.id } as Json })
    .eq("id", ws.user.id)

  revalidatePath("/dashboard/profile")
  return { success: true, profile: { report: result.data, meta, updatedAt: saved.artifact.updated_at } }
}
