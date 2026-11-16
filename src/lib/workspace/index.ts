/**
 * Capability-checked workspace access for Anza 2.0 server actions and pages.
 */
import type { AiCaller } from "@/src/lib/ai/service"
import type { Locale } from "@/src/lib/i18n/config"
import { getLocale } from "@/src/lib/i18n/server"
import { roleCan, type Capability } from "@/src/lib/permissions"
import { getEntitlements, getEntitlementsForUserId } from "@/src/lib/entitlements"
import type { UserPlanTier } from "@/src/lib/plans"
import { getActiveStartupAccess, type AccessError, type StartupAccess } from "@/src/lib/workspace-access"

export type Workspace = StartupAccess & {
  /** Plan of the business owner — it governs what the whole team can use here. */
  tier: UserPlanTier
  unlimited: boolean
  locale: Locale
  /** Identity passed to the AI service for gating and usage tracking. */
  caller: AiCaller
}

export const READ_ONLY_ROLE = "Your role in this business is read-only."

async function resolveWorkspaceEntitlements(access: StartupAccess) {
  // The signed-in platform admin is unrestricted even inside another team's
  // workspace. Co-founders otherwise inherit the startup owner's plan.
  const own = getEntitlements(access.user)
  return own.unlimited ? own : getEntitlementsForUserId(access.startup.owner_id)
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

  const [entitlements, locale] = await Promise.all([resolveWorkspaceEntitlements(access), getLocale()])
  return {
    ...access,
    tier: entitlements.tier,
    unlimited: entitlements.unlimited,
    locale,
    caller: { userId: access.user.id, startupId: access.startup.id, tier: entitlements.tier, unlimited: entitlements.unlimited },
  }
}

/** Standard result shape for 2.0 server actions. */
export type ActionResult<T = Record<never, never>> = ({ success: true } & T) | { success: false; error: string }

export function fail(error: string): { success: false; error: string } {
  return { success: false, error }
}
