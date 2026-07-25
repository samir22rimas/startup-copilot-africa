"use server"

import {
  buildDerivedFocusPlan,
  getWeekStartISO,
  isWeeklyFocusPlan,
  readWeeklyFocusPlan,
  type WeeklyFocusPlan,
} from "@/src/lib/focus-plan"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function getOwnedProject(projectId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !projectId) return { error: "Please sign in." as const }

  const { data: startup } = await supabase
    .from("startups")
    .select("id, name, industry, city, country_code")
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!startup) return { error: "Startup not found." as const }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description, target_audience, metadata")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle()
  if (!project) return { error: "Project not found." as const }

  const metadata =
    project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : {}

  return { supabase, startup, project, metadata }
}

function tasksFromMetadata(metadata: Record<string, unknown>) {
  const raw = metadata.tasks
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      const task = t as Record<string, unknown>
      return {
        id: String(task.id || ""),
        title: String(task.title || "Untitled"),
        tag: String(task.tag || "Custom"),
        done: Boolean(task.done),
      }
    })
    .filter((t) => t.id)
}

async function savePlan(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  projectId: string,
  metadata: Record<string, unknown>,
  plan: WeeklyFocusPlan,
) {
  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, weekly_focus_plan: plan } as any })
    .eq("id", projectId)
  return error
}

/** Ensure current week has a plan (derived from milestones). Call from getDashboardData. */
export async function ensureWeeklyFocusPlan(
  projectId: string,
): Promise<WeeklyFocusPlan | null> {
  const owned = await getOwnedProject(projectId)
  if ("error" in owned) return null

  const { supabase, startup, metadata } = owned
  const weekStart = getWeekStartISO()
  const existing = readWeeklyFocusPlan(metadata)

  if (existing && existing.weekStart === weekStart && existing.priorities.length >= 1) {
    return existing
  }

  const plan = buildDerivedFocusPlan(tasksFromMetadata(metadata), startup.name)
  const error = await savePlan(supabase, projectId, metadata, plan)
  if (error) {
    console.error("ensureWeeklyFocusPlan", error.message)
    return plan
  }
  return plan
}

export async function regenerateWeeklyFocusPlan(
  projectId: string,
  mode: "derived" | "ai" = "ai",
): Promise<{ success: true; plan: WeeklyFocusPlan } | { success: false; error: string }> {
  const owned = await getOwnedProject(projectId)
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, startup, project, metadata } = owned
  const tasks = tasksFromMetadata(metadata)

  if (mode === "derived") {
    const plan = buildDerivedFocusPlan(tasks, startup.name)
    const error = await savePlan(supabase, projectId, metadata, plan)
    if (error) return { success: false, error: error.message }
    revalidatePath("/dashboard")
    return { success: true, plan }
  }

  const incomplete = tasks.filter((t) => !t.done).map((t) => `- [${t.tag}] ${t.title}`).join("\n")
  const systemPrompt = `You are a startup operator coaching an African founder.
Propose exactly 3 priorities for THIS WEEK only — concrete, finishable in 7 days.
Return ONLY valid JSON:
{
  "priorities": [
    { "title": "...", "why": "one sentence why this matters now" },
    { "title": "...", "why": "..." },
    { "title": "...", "why": "..." }
  ]
}
Rules: no fluff, prefer customer/revenue/payment validation over more planning docs.
Startup: ${startup.name}
Industry: ${startup.industry || "N/A"}
Location: ${startup.city || "N/A"}, ${startup.country_code}
Project: ${project.title}
Description: ${project.description || "N/A"}
Audience: ${project.target_audience || "N/A"}
Incomplete milestones:
${incomplete || "(none — invent 3 practical launch priorities)"}`

  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
    const response = await generateTextWithFallback(systemPrompt, [], { maxTokens: 700, temperature: 0.5 })
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { success: false, error: "AI returned no JSON. Try again." }
    const parsed = JSON.parse(jsonMatch[0]) as {
      priorities?: Array<{ title?: string; why?: string }>
    }
    if (!Array.isArray(parsed.priorities) || parsed.priorities.length < 3) {
      return { success: false, error: "AI returned an incomplete focus plan." }
    }

    const plan: WeeklyFocusPlan = {
      weekStart: getWeekStartISO(),
      generatedAt: new Date().toISOString(),
      source: "projected",
      checkIn: null,
      priorities: parsed.priorities.slice(0, 3).map((p, i) => ({
        id: `focus-ai-${Date.now()}-${i}`,
        title: String(p.title || `Priority ${i + 1}`).slice(0, 160),
        why: String(p.why || "Focus for this week.").slice(0, 280),
        done: false,
      })),
    }

    const error = await savePlan(supabase, projectId, metadata, plan)
    if (error) return { success: false, error: error.message }
    revalidatePath("/dashboard")
    return { success: true, plan }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: "Could not generate focus plan: " + message }
  }
}

export async function toggleFocusPriority(
  projectId: string,
  priorityId: string,
  done: boolean,
): Promise<{ success: true; plan: WeeklyFocusPlan } | { success: false; error: string }> {
  const owned = await getOwnedProject(projectId)
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, metadata } = owned
  const plan = readWeeklyFocusPlan(metadata)
  if (!plan || !isWeeklyFocusPlan(plan)) {
    return { success: false, error: "No focus plan for this week." }
  }

  const next: WeeklyFocusPlan = {
    ...plan,
    priorities: plan.priorities.map((p) => (p.id === priorityId ? { ...p, done } : p)),
  }

  // If linked to a milestone, keep milestone in sync
  const priority = plan.priorities.find((p) => p.id === priorityId)
  let metadataNext: Record<string, unknown> = { ...metadata, weekly_focus_plan: next }
  if (priority?.linkedTaskId) {
    const tasks = tasksFromMetadata(metadata).map((t) =>
      t.id === priority.linkedTaskId ? { ...t, done } : t,
    )
    metadataNext = { ...metadataNext, tasks }
  }

  const { error } = await supabase
    .from("projects")
    .update({ metadata: metadataNext as any })
    .eq("id", projectId)

  if (error) return { success: false, error: error.message }
  revalidatePath("/dashboard")
  return { success: true, plan: next }
}

export async function completeWeeklyCheckIn(
  projectId: string,
  note: string,
): Promise<{ success: true; plan: WeeklyFocusPlan } | { success: false; error: string }> {
  const owned = await getOwnedProject(projectId)
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, metadata } = owned
  const plan = readWeeklyFocusPlan(metadata)
  if (!plan) return { success: false, error: "No focus plan for this week." }

  const next: WeeklyFocusPlan = {
    ...plan,
    checkIn: {
      completedAt: new Date().toISOString(),
      note: note.trim().slice(0, 500),
    },
  }

  const error = await savePlan(supabase, projectId, metadata, next)
  if (error) return { success: false, error: error.message }
  revalidatePath("/dashboard")
  return { success: true, plan: next }
}
