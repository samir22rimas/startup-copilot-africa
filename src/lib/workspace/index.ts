/**
 * Capability-checked workspace access for Anza 2.0 server actions and pages.
 */
import type { AiCaller } from "@/src/lib/ai/service"
import type { Locale } from "@/src/lib/i18n/config"
import { getLocale } from "@/src/lib/i18n/server"
import { roleCan, type Capability } from "@/src/lib/permissions"
import { getPlanTier, type UserPlanTier } from "@/src/lib/plans"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { getActiveStartupAccess, type AccessError, type StartupAccess } from "@/src/lib/workspace-access"

export type Workspace = StartupAccess & {
  /** Plan of the business owner — it governs what the whole team can use here. */
  tier: UserPlanTier
  locale: Locale
  /** Identity passed to the AI service for gating and usage tracking. */
  caller: AiCaller
}

export const READ_ONLY_ROLE = "Your role in this business is read-only."

async function resolveWorkspaceTier(access: StartupAccess): Promise<UserPlanTier> {
  if (access.startup.owner_id === access.user.id) return getPlanTier(access.user)
  try {
    const { data } = await getSupabaseAdmin().auth.admin.getUserById(access.startup.owner_id)
    return getPlanTier(data?.user)
  } catch {
    return "Free"
  }
}

/**
 * The active business for the signed-in user, provided their role allows
 * `capability`. Every 2.0 server action starts here; row-level security then
 * enforces the same rule again in the database.
 */
export async function requireWorkspace(capability: Capability = "view"): Promise<Workspace | AccessError> {
  const access = await getActiveStartupAccess()
  if ("error" in access) return access
  if (!roleCan(access.role, capability)) return { error: READ_ONLY_ROLE }

  const [tier, locale] = await Promise.all([resolveWorkspaceTier(access), getLocale()])
  return {
    ...access,
    tier,
    locale,
    caller: { userId: access.user.id, startupId: access.startup.id, tier },
  }
}

/** Standard result shape for 2.0 server actions. */
export type ActionResult<T = Record<never, never>> = ({ success: true } & T) | { success: false; error: string }

export function fail(error: string): { success: false; error: string } {
  return { success: false, error }
}
