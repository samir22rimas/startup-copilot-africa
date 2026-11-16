/**
 * What each workspace role may do. Mirrors the row-level-security helpers in
 * the database (can_edit_startup / can_comment_startup / has_startup_role) —
 * the database is the enforcement point, this file keeps the UI and server
 * actions honest about it.
 */
import type { MemberRole } from "@/src/lib/database.types"

export type Capability =
  /** Read workspace content. */
  | "view"
  /** Comment on tasks and post in team chat. */
  | "comment"
  /** Create and change workspace content (plans, tasks, documents...). */
  | "edit"
  /** Change business settings and manage the team. */
  | "manage"
  /** Delete the business, manage co-founder admins. */
  | "own"

const ROLE_CAPABILITIES: Record<MemberRole, readonly Capability[]> = {
  owner: ["view", "comment", "edit", "manage", "own"],
  admin: ["view", "comment", "edit", "manage"],
  member: ["view", "comment", "edit"],
  advisor: ["view", "comment"],
  viewer: ["view"],
}

export function roleCan(role: MemberRole | null | undefined, capability: Capability): boolean {
  return Boolean(role && ROLE_CAPABILITIES[role]?.includes(capability))
}

export function capabilitiesFor(role: MemberRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role]
}
