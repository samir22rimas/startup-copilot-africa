import type { User } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export interface AdminUserContext {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

/**
 * Platform admins are listed in the server-only ADMIN_EMAILS environment
 * variable (comma separated). It is deliberately NOT a NEXT_PUBLIC_ variable
 * and not hardcoded, so the list never ships to the browser or the repo.
 */
function adminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * True when this account is a platform admin: either its verified email is on
 * the ADMIN_EMAILS allowlist, or `app_metadata.role` is "admin" (settable only
 * with the service role). An unverified email never qualifies.
 */
export function isPlatformAdmin(user: User | null | undefined): boolean {
  if (!user) return false
  if (user.app_metadata?.role === "admin") return true

  const email = user.email?.trim().toLowerCase()
  if (!email || !user.email_confirmed_at) return false
  return adminEmailAllowlist().includes(email)
}

/**
 * Server-side check that the requesting user is a platform admin.
 * Redirects everyone else unless `throwOnUnauthorized` is false.
 */
export async function verifyAdminSession(options: { throwOnUnauthorized?: boolean } = {}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (options.throwOnUnauthorized === false) return null
    redirect("/sign-in")
  }

  if (!isPlatformAdmin(user)) {
    if (options.throwOnUnauthorized === false) return null
    redirect("/dashboard")
  }

  // Own profile row — readable through RLS, no service role needed.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const metadataName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null
  const metadataAvatar =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null

  const adminContext: AdminUserContext = {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name || metadataName || user.email?.split("@")[0] || "Admin",
    avatarUrl: profile?.avatar_url || metadataAvatar || null,
  }

  return { user, adminContext }
}

/**
 * Service-role client for a verified platform admin; throws for anyone else.
 * Every admin server action must start here — they are callable from any
 * browser, so the check cannot live in the UI.
 */
export const ADMIN_NOT_AUTHORIZED = "You are not authorized to perform this action."

export async function requireAdminClient() {
  const session = await verifyAdminSession({ throwOnUnauthorized: false })
  if (!session) throw new Error(ADMIN_NOT_AUTHORIZED)
  const { getSupabaseAdmin } = await import("@/src/lib/supabase/admin")
  return { supabase: getSupabaseAdmin(), admin: session.user }
}

/** Append-only trail of what platform admins changed. Best-effort. */
export async function recordAdminAudit(
  admin: Pick<User, "id" | "email">,
  action: string,
  target: { type: string; id: string },
  details: Record<string, string | number | boolean | null> = {},
) {
  try {
    const { getSupabaseAdmin } = await import("@/src/lib/supabase/admin")
    await getSupabaseAdmin().from("audit_logs").insert({
      actor_id: admin.id,
      actor_email: admin.email ?? null,
      action,
      target_type: target.type,
      target_id: target.id,
      details,
    })
  } catch (error) {
    console.warn("[admin] audit entry not recorded:", error instanceof Error ? error.message : error)
  }
}
