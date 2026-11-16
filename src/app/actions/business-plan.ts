"use server"

import { randomBytes } from "node:crypto"

import { revalidatePath } from "next/cache"

import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { featureLockedMessage, runAi } from "@/src/lib/ai/service"
import {
  MAX_SECTION_LENGTH,
  PLAN_SECTION_GUIDE,
  isPlanSectionKey,
  readPlanSections,
  type PlanSection,
  type PlanSectionKey,
  type PlanSections,
} from "@/src/lib/plan"
import { planHasFeature } from "@/src/lib/plans"
import { getSiteUrl } from "@/src/lib/site-url"
import { cleanText, isUuid } from "@/src/lib/validation"
import { fail, requireWorkspace, type ActionResult, type Workspace } from "@/src/lib/workspace"
import { logActivity } from "@/src/lib/workspace/activity"
import {
  getLatestArtifact,
  listArtifactVersions,
  restoreArtifactVersion,
  saveArtifact,
  type ArtifactVersionSummary,
} from "@/src/lib/workspace/artifacts"

const PATH = "/dashboard/plan"
const TITLE = "Business Plan"

export interface PlanState {
  id: string | null
  sections: PlanSections
  version: number
  updatedAt: string | null
}

export interface PlanShareLink {
  id: string
  url: string
  expiresAt: string
}

async function loadPlan(ws: Workspace): Promise<PlanState> {
  const artifact = await getLatestArtifact(ws, "plan", "business_plan")
  return {
    id: artifact?.id ?? null,
    sections: readPlanSections(artifact?.content),
    version: artifact?.current_version ?? 0,
    updatedAt: artifact?.updated_at ?? null,
  }
}

async function storeSections(
  ws: Workspace,
  plan: PlanState,
  sections: PlanSections,
  versionNote?: string,
): Promise<PlanState | { error: string }> {
  const saved = await saveArtifact(ws, {
    id: plan.id,
    module: "plan",
    kind: "business_plan",
    title: TITLE,
    content: { sections },
    versionNote,
  })
  if ("error" in saved) return saved
  revalidatePath(PATH)
  return {
    id: saved.artifact.id,
    sections: readPlanSections(saved.artifact.content),
    version: saved.artifact.current_version,
    updatedAt: saved.artifact.updated_at,
  }
}

export async function getPlan(): Promise<PlanState | null> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return null
  return loadPlan(ws)
}

/**
 * Writes one section with AI.
 * - no existing text: a first draft
 * - `instruction` given: improves the current text following it
 * - otherwise: a fresh rewrite
 * The result is saved straight into the plan.
 */
export async function writePlanSection(input: {
  section: string
  instruction?: string
}): Promise<ActionResult<{ plan: PlanState; section: PlanSection }>> {
  if (!isPlanSectionKey(input?.section)) return fail("That section is not available.")
  const key: PlanSectionKey = input.section
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const guide = PLAN_SECTION_GUIDE[key]
  const instruction = cleanText(input.instruction, 600)
  const plan = await loadPlan(ws)
  const current = plan.sections[key]?.markdown ?? ""
  const context = await buildBusinessContext(ws, Array.from(new Set([...guide.context, "plan" as const])))

  const task =
    instruction && current
      ? `Improve the existing "${guide.title}" section according to the founder's instruction. Keep what is good, keep facts unchanged unless told otherwise, and return the complete revised section.`
      : `Write the "${guide.title}" section of the business plan. ${guide.brief}`

  const result = await runAi({
    feature: `plan.section.${key}`,
    caller: ws.caller,
    gate: "business_plan",
    system: baseSystemPrompt({
      role: "a business plan consultant writing for lenders, investors and partners",
      locale: ws.locale,
      extra: `${task}

Writing rules:
- Output GitHub-flavoured Markdown for this ONE section only. Do not repeat the section title as a heading; start with the content. Use ### sub-headings, short paragraphs, bullet lists and tables where they help.
- 250 to 500 words unless the section needs a table.
- Stay consistent with the other plan sections, the business model, the financial model and the evidence in the business data. Never contradict them; if they conflict with each other, say so in a short note at the end.
- Mark unverified statements inline as "(assumption)" and reasoned numbers as "(estimate)". Where the founder must supply a fact, leave a placeholder in [square brackets].
- Professional, concrete and specific to this business and country. No filler, no generic advice.`,
    }),
    messages: [
      {
        role: "user",
        content: [
          context,
          current && instruction ? `Current text of this section:\n${fence("business_data", current, 9000)}` : null,
          instruction ? `Founder's instruction:\n${fence("founder_input", instruction, 600)}` : null,
          "Write the section now.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    maxTokens: 1800,
    temperature: 0.45,
  })
  if (!result.ok) return fail(result.error)

  const markdown = result.text.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/, "").trim()
  if (markdown.length < 40) return fail("The AI returned an empty section. Please try again.")

  const section: PlanSection = {
    markdown: markdown.slice(0, MAX_SECTION_LENGTH),
    source: "ai",
    updatedAt: new Date().toISOString(),
  }
  // Re-read so a section a teammate saved meanwhile is not overwritten.
  const latest = await loadPlan(ws)
  const stored = await storeSections(ws, latest, { ...latest.sections, [key]: section })
  if ("error" in stored) return fail(stored.error)

  if (!plan.id) {
    await logActivity(ws, { action: "plan.started", entityType: "artifact", entityId: stored.id, summary: "Started the business plan" })
  }
  return { success: true, plan: stored, section }
}

export async function savePlanSection(input: {
  section: string
  markdown: string
}): Promise<ActionResult<{ plan: PlanState }>> {
  if (!isPlanSectionKey(input?.section)) return fail("That section is not available.")
  if (typeof input.markdown !== "string") return fail("Nothing to save.")
  if (input.markdown.length > MAX_SECTION_LENGTH) return fail("This section is too long. Shorten it and try again.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const plan = await loadPlan(ws)
  const markdown = input.markdown.replace(/\u0000/g, "").trim()
  const sections = { ...plan.sections }
  if (markdown) sections[input.section] = { markdown, source: "edited", updatedAt: new Date().toISOString() }
  else delete sections[input.section]

  const stored = await storeSections(ws, plan, sections)
  if ("error" in stored) return fail(stored.error)
  return { success: true, plan: stored }
}

export async function savePlanVersion(note: string): Promise<ActionResult<{ plan: PlanState }>> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const plan = await loadPlan(ws)
  if (!plan.id) return fail("Write at least one section before saving a version.")
  const stored = await storeSections(ws, plan, plan.sections, cleanText(note, 300) || "Saved version")
  if ("error" in stored) return fail(stored.error)
  await logActivity(ws, {
    action: "plan.version_saved",
    entityType: "artifact",
    entityId: stored.id,
    summary: `Saved version ${stored.version} of the business plan`,
  })
  return { success: true, plan: stored }
}

export async function listPlanVersions(): Promise<ArtifactVersionSummary[]> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []
  const plan = await loadPlan(ws)
  return plan.id ? listArtifactVersions(ws, plan.id) : []
}

export async function restorePlanVersion(versionId: string): Promise<ActionResult<{ plan: PlanState }>> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const restored = await restoreArtifactVersion(ws, versionId)
  if ("error" in restored) return fail(restored.error)
  if (restored.artifact.module !== "plan") return fail("That version is no longer available.")
  revalidatePath(PATH)
  return {
    success: true,
    plan: {
      id: restored.artifact.id,
      sections: readPlanSections(restored.artifact.content),
      version: restored.artifact.current_version,
      updatedAt: restored.artifact.updated_at,
    },
  }
}

// --- Sharing ----------------------------------------------------------------

async function shareUrl(token: string) {
  return `${await getSiteUrl()}/share/${token}`
}

export async function getPlanShareLink(): Promise<PlanShareLink | null> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return null
  const plan = await loadPlan(ws)
  if (!plan.id) return null
  const { data } = await ws.supabase
    .from("shared_links")
    .select("id, token, expires_at")
    .eq("artifact_id", plan.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? { id: data.id, url: await shareUrl(data.token), expiresAt: data.expires_at } : null
}

/** Creates a read-only public link to the plan, valid for 30 days. */
export async function createPlanShareLink(): Promise<ActionResult<{ link: PlanShareLink }>> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  if (!planHasFeature(ws.tier, "plan_sharing")) return fail(featureLockedMessage("plan_sharing"))
  const plan = await loadPlan(ws)
  if (!plan.id) return fail("Write at least one section before sharing the plan.")

  const token = randomBytes(32).toString("base64url")
  const { data, error } = await ws.supabase
    .from("shared_links")
    .insert({ token, artifact_id: plan.id, startup_id: ws.startup.id, created_by: ws.user.id })
    .select("id, token, expires_at")
    .maybeSingle()
  if (error || !data) return fail("Could not create the link. Please try again.")

  await logActivity(ws, { action: "plan.shared", entityType: "artifact", entityId: plan.id, summary: "Created a share link for the business plan" })
  return { success: true, link: { id: data.id, url: await shareUrl(data.token), expiresAt: data.expires_at } }
}

export async function revokePlanShareLink(linkId: string): Promise<ActionResult> {
  if (!isUuid(linkId)) return fail("That link is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const { error, count } = await ws.supabase
    .from("shared_links")
    .update({ revoked_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", linkId)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not turn off the link.")
  return { success: true }
}
