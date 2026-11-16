import type { User } from "@supabase/supabase-js"

import type { Database, MemberRole } from "@/src/lib/database.types"
import { readActiveStartupCookie, resolveActiveStartup } from "@/src/lib/active-startup"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { isUuid } from "@/src/lib/validation"

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type StartupRow = Database["public"]["Tables"]["startups"]["Row"]
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"]

export type AccessError = { error: string }

export type StartupAccess = {
  supabase: ServerClient
  user: User
  startup: StartupRow
  role: MemberRole
}

export type ProjectAccess = StartupAccess & {
  project: ProjectRow
  metadata: Record<string, unknown>
}

export const SIGN_IN_REQUIRED = "Please sign in to continue."
export const PROJECT_UNAVAILABLE = "This project is not available to you."
export const STARTUP_UNAVAILABLE = "Your startup could not be found."

export function readProjectMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

async function getMembershipRole(
  supabase: ServerClient,
  startupId: string,
  userId: string,
): Promise<MemberRole | null> {
  const { data } = await supabase
    .from("startup_members")
    .select("role")
    .eq("startup_id", startupId)
    .eq("user_id", userId)
    .maybeSingle()
  return data?.role ?? null
}

/** Membership role, falling back to "owner" for the owner of record. */
function resolveRole(role: MemberRole | null, startup: StartupRow, userId: string): MemberRole | null {
  return role ?? (startup.owner_id === userId ? "owner" : null)
}

/**
 * Resolves a project the signed-in user may work on, together with its startup
 * and the user's role there. Access comes from team membership (enforced again
 * by row-level security), so co-founders and members get the same workspace as
 * the owner, and users with several startups always get the right one.
 */
export async function getProjectAccess(projectId: string): Promise<ProjectAccess | AccessError> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: SIGN_IN_REQUIRED }
  if (!isUuid(projectId)) return { error: PROJECT_UNAVAILABLE }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle()
  if (!project) return { error: PROJECT_UNAVAILABLE }

  const [{ data: startup }, role] = await Promise.all([
    supabase.from("startups").select("*").eq("id", project.startup_id).maybeSingle(),
    getMembershipRole(supabase, project.startup_id, user.id),
  ])
  const effectiveRole = startup ? resolveRole(role, startup, user.id) : null
  if (!startup || !effectiveRole) return { error: PROJECT_UNAVAILABLE }

  return {
    supabase,
    user,
    startup,
    role: effectiveRole,
    project,
    metadata: readProjectMetadata(project.metadata),
  }
}

/** The startup currently selected in the sidebar, for the signed-in user. */
export async function getActiveStartupAccess(): Promise<StartupAccess | AccessError> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: SIGN_IN_REQUIRED }

  // RLS returns only startups this user belongs to.
  const { data: startups } = await supabase
    .from("startups")
    .select("*")
    .order("created_at", { ascending: false })
  if (!startups?.length) return { error: STARTUP_UNAVAILABLE }

  const startup = resolveActiveStartup(startups, await readActiveStartupCookie())
  const role = resolveRole(await getMembershipRole(supabase, startup.id, user.id), startup, user.id)
  if (!role) return { error: STARTUP_UNAVAILABLE }

  return { supabase, user, startup, role }
}

/** Owners and co-founder admins may change startup-level settings and the team. */
export function canManageStartup(role: MemberRole): boolean {
  return role === "owner" || role === "admin"
}
