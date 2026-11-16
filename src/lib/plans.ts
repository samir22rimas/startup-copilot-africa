/**
 * Plans, limits and feature gates — the ONE place they are defined.
 *
 * The tier lives in Supabase `app_metadata.plan_tier`, which only the service
 * role can write. It must never be read from `user_metadata`: users can edit
 * that themselves from the browser.
 *
 * Nothing else in the codebase should compare tier names or hardcode a limit;
 * ask `getPlanLimits(tier)` or `planHasFeature(tier, feature)` instead.
 */
export const PLAN_TIERS = ["Free", "Pro", "Team"] as const

export type UserPlanTier = (typeof PLAN_TIERS)[number]

/** Tier names used before Anza 2.0, mapped to their closest current plan. */
const LEGACY_TIERS: Record<string, UserPlanTier> = {
  Starter: "Pro",
  Enterprise: "Team",
}

/** Capabilities that depend on the plan. */
export const FEATURES = [
  "idea_lab",
  "business_plan",
  "business_model",
  "validation",
  "projects",
  "documents",
  "copilot",
  "market_research",
  "web_research",
  "financial_planning",
  "marketing_studio",
  "copilot_specialists",
  "copilot_memory",
  "plan_sharing",
  "team_roles",
] as const

export type Feature = (typeof FEATURES)[number]

export interface PlanLimits {
  /** AI generations (chat replies, documents, plans) per calendar month. */
  monthlyAiGenerations: number
  /** People per business, including the owner. */
  teamSeats: number
  /** Businesses one account may own. */
  startups: number
  /** Ideas that can be kept in the Idea Lab. */
  savedIdeas: number
  /** Stored versions kept per document before the oldest are trimmed in the UI. */
  versionHistory: number
  /**
   * Indicative list price in USD. No payment provider is connected yet, so
   * this is used only for labels and "list value" estimates — never as
   * collected revenue.
   */
  monthlyPriceUsd: number
}

export const PLAN_LIMITS: Record<UserPlanTier, PlanLimits> = {
  Free: { monthlyAiGenerations: 150, teamSeats: 3, startups: 2, savedIdeas: 10, versionHistory: 5, monthlyPriceUsd: 0 },
  Pro: { monthlyAiGenerations: 1500, teamSeats: 5, startups: 5, savedIdeas: 100, versionHistory: 50, monthlyPriceUsd: 19 },
  Team: { monthlyAiGenerations: 5000, teamSeats: 25, startups: 15, savedIdeas: 500, versionHistory: 200, monthlyPriceUsd: 49 },
}

const FREE_FEATURES: Feature[] = [
  "idea_lab",
  "business_plan",
  "business_model",
  "validation",
  "projects",
  "documents",
  "copilot",
  "market_research",
]

const PRO_FEATURES: Feature[] = [
  ...FREE_FEATURES,
  "web_research",
  "financial_planning",
  "marketing_studio",
  "copilot_specialists",
  "copilot_memory",
  "plan_sharing",
]

const PLAN_FEATURES: Record<UserPlanTier, ReadonlySet<Feature>> = {
  Free: new Set(FREE_FEATURES),
  Pro: new Set(PRO_FEATURES),
  Team: new Set([...PRO_FEATURES, "team_roles"]),
}

export function isPlanTier(value: unknown): value is UserPlanTier {
  return typeof value === "string" && (PLAN_TIERS as readonly string[]).includes(value)
}

/** Accepts current and pre-2.0 tier names; anything else is Free. */
export function normalizePlanTier(value: unknown): UserPlanTier {
  if (isPlanTier(value)) return value
  if (typeof value === "string" && value in LEGACY_TIERS) return LEGACY_TIERS[value]
  return "Free"
}

/** Reads the tier from server-controlled metadata. Anything else is Free. */
export function getPlanTier(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
): UserPlanTier {
  return normalizePlanTier(user?.app_metadata?.plan_tier)
}

export function getPlanLimits(tier: UserPlanTier): PlanLimits {
  return PLAN_LIMITS[tier]
}

export function planHasFeature(tier: UserPlanTier, feature: Feature): boolean {
  return PLAN_FEATURES[tier].has(feature)
}

/** The cheapest plan that includes a feature — used in upgrade prompts. */
export function minimumPlanFor(feature: Feature): UserPlanTier {
  return PLAN_TIERS.find((tier) => PLAN_FEATURES[tier].has(feature)) ?? "Team"
}

/** First instant of the current UTC month — the start of the quota window. */
export function currentQuotaWindowStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/** First instant of next UTC month — when the quota resets. */
export function nextQuotaReset(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}
