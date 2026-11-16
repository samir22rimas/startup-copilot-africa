import type { Workspace } from "@/src/lib/workspace"

/**
 * Records something a teammate did, for the workspace activity feed.
 * Best-effort: a failed log entry must never fail the action itself.
 */
export async function logActivity(
  workspace: Pick<Workspace, "supabase" | "user" | "startup">,
  entry: { action: string; entityType: string; entityId?: string | null; summary: string },
): Promise<void> {
  try {
    const { error } = await workspace.supabase.from("activity_log").insert({
      startup_id: workspace.startup.id,
      actor_id: workspace.user.id,
      action: entry.action.slice(0, 60),
      entity_type: entry.entityType.slice(0, 40),
      entity_id: entry.entityId ?? null,
      summary: entry.summary.replace(/\s+/g, " ").trim().slice(0, 300) || entry.action,
    })
    if (error) console.warn("[activity] not recorded:", error.message)
  } catch (error) {
    console.warn("[activity] not recorded:", error instanceof Error ? error.message : error)
  }
}
