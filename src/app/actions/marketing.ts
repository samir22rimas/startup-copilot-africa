"use server"

import type { Json } from "@/src/lib/database.types"
import {
  type MarketingWorkspaceData,
  type PersistedMarketingEvent,
  readMarketingWorkspace,
  readMetadata,
} from "@/src/lib/data-truth"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function getOwnedProject(projectId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !projectId) return { error: "Please sign in." as const }

  const { data: startup } = await supabase.from("startups").select("id").eq("owner_id", user.id).maybeSingle()
  if (!startup) return { error: "Startup not found." as const }

  const { data: project } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle()
  if (!project) return { error: "Project not found." as const }

  return { supabase, project, metadata: readMetadata(project.metadata) }
}

export async function addMarketingEvent(
  projectId: string,
  input: { day: number; label: string; color: string; content?: string },
): Promise<{ success: true; event: PersistedMarketingEvent } | { success: false; error: string }> {
  const owned = await getOwnedProject(projectId)
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, project, metadata } = owned
  const workspace = readMarketingWorkspace(metadata)
  const event: PersistedMarketingEvent = {
    id: `evt-${Date.now()}`,
    day: Math.min(31, Math.max(1, Math.round(input.day))),
    label: input.label.trim().slice(0, 120),
    color: input.color,
    content: input.content?.trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
  }

  const next: MarketingWorkspaceData = {
    events: [...workspace.events, event],
    updatedAt: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, marketing_workspace: next as unknown as Json } })
    .eq("id", project.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard/marketing")
  revalidatePath("/dashboard")
  return { success: true, event }
}

export async function removeMarketingEvent(
  projectId: string,
  eventId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await getOwnedProject(projectId)
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, project, metadata } = owned
  const workspace = readMarketingWorkspace(metadata)
  const next: MarketingWorkspaceData = {
    events: workspace.events.filter((e) => e.id !== eventId),
    updatedAt: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, marketing_workspace: next as unknown as Json } })
    .eq("id", project.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard/marketing")
  revalidatePath("/dashboard")
  return { success: true }
}
