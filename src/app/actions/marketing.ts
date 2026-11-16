"use server"

import type { Json } from "@/src/lib/database.types"
import {
  type MarketingWorkspaceData,
  type PersistedMarketingEvent,
  readMarketingWorkspace,
} from "@/src/lib/data-truth"
import { cleanText } from "@/src/lib/validation"
import { getProjectAccess } from "@/src/lib/workspace-access"
import { revalidatePath } from "next/cache"

const EVENT_COLORS = /^[\w\s\-/:.[\]]{1,160}$/
const MAX_EVENTS = 200

async function getOwnedProject(projectId: string) {
  return getProjectAccess(projectId, "edit")
}

export async function addMarketingEvent(
  projectId: string,
  input: { day: number; label: string; color: string; content?: string },
): Promise<{ success: true; event: PersistedMarketingEvent } | { success: false; error: string }> {
  const owned = await getOwnedProject(projectId)
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, project, metadata } = owned
  const workspace = readMarketingWorkspace(metadata)
  const label = cleanText(input?.label, 120)
  if (!label) return { success: false, error: "Give the post a title." }
  if (workspace.events.length >= MAX_EVENTS) {
    return { success: false, error: "The calendar is full — remove old posts first." }
  }

  const event: PersistedMarketingEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    day: Math.min(31, Math.max(1, Math.round(Number(input.day) || 1))),
    label,
    // Colour is a CSS class list chosen from the UI palette — never free-form markup.
    color: typeof input.color === "string" && EVENT_COLORS.test(input.color) ? input.color : "",
    content: cleanText(input.content, 2000) || undefined,
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

  if (error) return { success: false, error: "Could not save your changes. Please try again." }

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

  if (error) return { success: false, error: "Could not save your changes. Please try again." }

  revalidatePath("/dashboard/marketing")
  revalidatePath("/dashboard")
  return { success: true }
}
