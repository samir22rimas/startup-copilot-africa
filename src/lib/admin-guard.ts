import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"

export const PRIMARY_ADMIN_EMAIL = "yannsamir22@gmail.com"

export interface AdminUserContext {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

/**
 * Check if the given email has admin privileges.
 * Only yannsamir22@gmail.com (or any extra email listed in process.env.ADMIN_EMAILS) is allowed.
 */
export function isUserAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const userEmail = email.trim().toLowerCase()
  if (userEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) return true

  const adminEmailsEnv = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS
  if (adminEmailsEnv) {
    const allowed = adminEmailsEnv.split(",").map((e) => e.trim().toLowerCase())
    if (allowed.includes(userEmail)) return true
  }

  return false
}

/**
 * Server-side check to ensure the requesting user has Admin privileges.
 * Strictly checks for yannsamir22@gmail.com.
 * Redirects unauthorized users back to /dashboard.
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

  const isAuthorized = isUserAdminEmail(user.email)

  if (!isAuthorized) {
    if (options.throwOnUnauthorized === false) return null
    redirect("/dashboard")
  }

  let profileName: string | null = null
  let avatarUrl: string | null = null

  try {
    const adminSupabase = getSupabaseAdmin()
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()

    if (profile) {
      profileName = profile.full_name
      avatarUrl = profile.avatar_url
    }
  } catch (err) {
    console.warn("Could not fetch admin profile role from DB:", err)
  }

  return {
    user,
    adminContext: {
      id: user.id,
      email: user.email ?? "",
      fullName: profileName || user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
      avatarUrl: avatarUrl || user.user_metadata?.avatar_url || null,
    } as AdminUserContext,
  }
}
