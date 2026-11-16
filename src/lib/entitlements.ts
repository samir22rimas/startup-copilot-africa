/**
 * What a person may use: their plan's features and limits, or — for platform
 * administrators — everything, without limits.
 *
 * Server only. Platform administrators are the verified emails in the
 * server-only ADMIN_EMAILS variable (or app_metadata.role = "admin"), see
 * `isPlatformAdmin`. Everyone else, including co-founders and other team
 * members, gets the limits of their own plan, so their limits vary with it.
 */
import type { User } from "@supabase/supabase-js"

import { isPlatformAdmin } from "@/src/lib/admin-guard"
import { PLAN_TIERS, getPlanLimits, getPlanTier, type PlanLimits, type UserPlanTier } from "@/src/lib/plans"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"

/** The plan whose feature set contains every feature. */
export const TOP_TIER: UserPlanTier = PLAN_TIERS[PLAN_TIERS.length - 1]

const NO_LIMITS: PlanLimits = {
  monthlyAiGenerations: Number.POSITIVE_INFINITY,
  teamSeats: Number.POSITIVE_INFINITY,
  startups: Number.POSITIVE_INFINITY,
  savedIdeas: Number.POSITIVE_INFINITY,
  versionHistory: Number.POSITIVE_INFINITY,
  monthlyPriceUsd: 0,
}

export interface Entitlements {
  /** Plan used for feature checks. Platform admins get the top plan. */
  tier: UserPlanTier
  /** True for platform admins: no quota, no seat or business limit, feature switches ignored. */
  unlimited: boolean
  /** Numeric limits; every value is Infinity when `unlimited`. Never send these to the browser as-is. */
  limits: PlanLimits
}

type UserLike = Pick<User, "app_metadata" | "email" | "email_confirmed_at"> | null | undefined

export function getEntitlements(user: UserLike): Entitlements {
  if (user && isPlatformAdmin(user as User)) {
    return { tier: TOP_TIER, unlimited: true, limits: NO_LIMITS }
  }
  const tier = getPlanTier(user)
  return { tier, unlimited: false, limits: getPlanLimits(tier) }
}

/** Entitlements of another account (e.g. a business owner), looked up with the service role. */
export async function getEntitlementsForUserId(userId: string): Promise<Entitlements> {
  try {
    const { data } = await getSupabaseAdmin().auth.admin.getUserById(userId)
    return getEntitlements(data?.user)
  } catch {
    return getEntitlements(null)
  }
}

/** A limit safe to pass to client components: `null` means unlimited. */
export function serializableLimit(value: number): number | null {
  return Number.isFinite(value) ? value : null
}
