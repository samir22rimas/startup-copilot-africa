"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import { verifyAdminSession } from "@/src/lib/admin-guard"
import type { Database, Json } from "@/src/lib/database.types"
import { PLAN_LIMITS, getPlanTier, isPlanTier, type UserPlanTier as PlanTier } from "@/src/lib/plans"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { isUuid } from "@/src/lib/validation"

export type UserPlanTier = PlanTier

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

const NOT_AUTHORIZED = "You are not authorized to perform this action."

/**
 * Every admin action starts here. Returns the service-role client only for a
 * verified platform admin and throws otherwise, so nothing below can run for
 * anyone else — these functions are callable by any browser as server actions.
 */
async function requireAdmin() {
  const session = await verifyAdminSession({ throwOnUnauthorized: false })
  if (!session) throw new Error(NOT_AUTHORIZED)
  return getSupabaseAdmin()
}

/** Append-only trail of what platform admins changed. Best-effort. */
async function recordAdminAudit(
  action: string,
  target: { type: string; id: string },
  details: Record<string, string | number | boolean | null> = {},
) {
  try {
    const session = await verifyAdminSession({ throwOnUnauthorized: false })
    await getSupabaseAdmin().from("audit_logs").insert({
      actor_id: session?.user.id ?? null,
      actor_email: session?.user.email ?? null,
      action,
      target_type: target.type,
      target_id: target.id,
      details,
    })
  } catch (error) {
    console.warn("[admin] audit entry not recorded:", error instanceof Error ? error.message : error)
  }
}

/** Never leak raw database/provider errors to the client. */
function publicError(err: unknown, fallback: string) {
  // Let Next.js control-flow signals (redirects, dynamic rendering) pass through.
  unstable_rethrow(err)
  if (err instanceof Error && err.message === NOT_AUTHORIZED) return NOT_AUTHORIZED
  console.error("[admin]", err)
  return fallback
}

export interface AdminOverviewStats {
  totalUsers: number
  totalStartups: number
  totalProjects: number
  totalFeedbacks: number
  totalUsageEvents: number
  mrrEstimateCents: number
  planDistribution: Record<UserPlanTier, number>
  recentUsers: Array<{
    id: string
    email: string
    fullName: string
    createdAt: string
    tier: UserPlanTier
  }>
  recentFeedback: Array<{
    id: string
    userName: string
    userEmail: string
    category: string
    message: string
    rating: number | null
    createdAt: string
  }>
}

export interface AdminUserListItem {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  city: string | null
  countryCode: string | null
  createdAt: string
  lastActiveAt: string | null
  tier: UserPlanTier
  startupsCount: number
  feedbacksCount: number
}

export interface AdminStartupListItem {
  id: string
  name: string
  slug: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  countryCode: string
  city: string | null
  industry: string | null
  stage: string
  budgetCurrency: string
  estimatedBudgetCents: number | null
  onboardingStatus: string
  createdAt: string
}

export interface AdminFeedbackItem {
  id: string
  userId: string
  userName: string
  userEmail: string
  category: string
  message: string
  rating: number | null
  pageUrl: string | null
  createdAt: string
  status: "open" | "in_review" | "resolved" | "dismissed"
}

export interface AdminSubscriptionItem {
  userId: string
  userName: string
  userEmail: string
  tier: UserPlanTier
  status: "active" | "trialing" | "canceled"
  monthlyAmountUsd: number
  createdAt: string
}

export interface AdminUsageLogItem {
  id: number
  userId: string | null
  userEmail?: string
  startupId: string | null
  eventName: string
  quantity: number
  occurredAt: string
  metadata: Json
}

// ----------------------------------------------------
// 1. GET OVERVIEW STATS
// ----------------------------------------------------
export async function getAdminOverviewStats(): Promise<{
  success: true
  data: AdminOverviewStats
} | { success: false; error: string }> {
  try {
    const supabase = await requireAdmin()

    // Auth Users count & data
    const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const users = authData?.users || []
    const totalUsers = users.length

    // Startups count
    const { count: totalStartups } = await supabase
      .from("startups")
      .select("*", { count: "exact", head: true })

    // Projects count
    const { count: totalProjects } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })

    // Feedbacks
    const { data: feedbackRows } = await supabase
      .from("user_feedback")
      .select("id, user_id, category, message, rating, created_at")
      .order("created_at", { ascending: false })

    const totalFeedbacks = feedbackRows?.length || 0

    // Usage events count
    const { count: totalUsageEvents } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })

    // Profiles mapping
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, created_at")

    const profileMap = new Map<string, Partial<ProfileRow>>()
    profiles?.forEach((p) => profileMap.set(p.id, p))

    // Calculate plan distribution & MRR estimate
    const planDistribution: Record<UserPlanTier, number> = {
      Free: 0,
      Pro: 0,
      Team: 0,
    }

    let mrrCents = 0

    users.forEach((u) => {
      const tier = getPlanTier(u)
      if (planDistribution[tier] !== undefined) {
        planDistribution[tier]++
      } else {
        planDistribution.Free++
      }

      mrrCents += PLAN_LIMITS[tier].monthlyPriceUsd * 100
    })

    // Recent 5 Users
    const sortedUsers = [...users].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const recentUsers = sortedUsers.slice(0, 5).map((u) => {
      const prof = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email || "",
        fullName: prof?.full_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
        createdAt: u.created_at,
        tier: getPlanTier(u),
      }
    })

    // Recent 5 Feedbacks
    const recentFeedback = (feedbackRows || []).slice(0, 5).map((f) => {
      const authUser = users.find((u) => u.id === f.user_id)
      const prof = profileMap.get(f.user_id)
      return {
        id: f.id,
        userName: prof?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "User",
        userEmail: authUser?.email || "Unknown Email",
        category: f.category,
        message: f.message,
        rating: f.rating,
        createdAt: f.created_at,
      }
    })

    return {
      success: true,
      data: {
        totalUsers,
        totalStartups: totalStartups || 0,
        totalProjects: totalProjects || 0,
        totalFeedbacks,
        totalUsageEvents: totalUsageEvents || 0,
        mrrEstimateCents: mrrCents,
        planDistribution,
        recentUsers,
        recentFeedback,
      },
    }
  } catch (err: unknown) {
    return { success: false, error: publicError(err, "Failed to load admin stats.") }
  }
}

// ----------------------------------------------------
// 2. GET USERS LIST
// ----------------------------------------------------
export async function getAdminUsersList(options?: {
  search?: string
  tierFilter?: string
}): Promise<{ success: true; users: AdminUserListItem[] } | { success: false; error: string }> {
  try {
    const supabase = await requireAdmin()

    const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUsers = authData?.users || []

    const { data: profiles } = await supabase.from("profiles").select("*")
    const { data: startups } = await supabase.from("startups").select("owner_id")
    const { data: feedbacks } = await supabase.from("user_feedback").select("user_id")

    const profileMap = new Map<string, Partial<ProfileRow>>()
    profiles?.forEach((p) => profileMap.set(p.id, p))

    const startupCounts = new Map<string, number>()
    startups?.forEach((s) => {
      startupCounts.set(s.owner_id, (startupCounts.get(s.owner_id) || 0) + 1)
    })

    const feedbackCounts = new Map<string, number>()
    feedbacks?.forEach((f) => {
      feedbackCounts.set(f.user_id, (feedbackCounts.get(f.user_id) || 0) + 1)
    })

    let result: AdminUserListItem[] = authUsers.map((u) => {
      const prof = profileMap.get(u.id)
      const tier = getPlanTier(u)
      const fullName = prof?.full_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "User"
      return {
        id: u.id,
        email: u.email || "",
        fullName,
        avatarUrl: prof?.avatar_url || null,
        city: prof?.city || null,
        countryCode: prof?.country_code || null,
        createdAt: u.created_at,
        lastActiveAt: prof?.last_active_at || u.last_sign_in_at || null,
        tier,
        startupsCount: startupCounts.get(u.id) || 0,
        feedbacksCount: feedbackCounts.get(u.id) || 0,
      }
    })

    if (options?.search) {
      const q = options.search.toLowerCase()
      result = result.filter(
        (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    }

    if (options?.tierFilter && options.tierFilter !== "all") {
      result = result.filter((u) => u.tier.toLowerCase() === options.tierFilter?.toLowerCase())
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { success: true, users: result }
  } catch (err: unknown) {
    return { success: false, error: publicError(err, "Failed to load users.") }
  }
}

// ----------------------------------------------------
// 3. UPDATE USER PLAN TIER
// ----------------------------------------------------
export async function updateUserPlanTierAction(
  userId: string,
  newTier: UserPlanTier
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await requireAdmin()

    if (!isUuid(userId) || !isPlanTier(newTier)) {
      return { success: false, error: "Invalid user or plan." }
    }

    // app_metadata is writable only with the service role — users cannot change it themselves.
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { plan_tier: newTier },
    })

    if (authErr) {
      console.error("[admin] plan update failed:", authErr.message)
      return { success: false, error: "Failed to update user plan." }
    }

    // Billing record (no payment provider yet: provider stays null = set by an admin).
    const { error: subErr } = await supabase
      .from("subscriptions")
      .upsert(
        { user_id: userId, plan: newTier.toLowerCase() as "free" | "pro" | "team", status: "active" },
        { onConflict: "user_id" },
      )
    if (subErr && subErr.code !== "42P01" && subErr.code !== "PGRST205") {
      console.error("[admin] subscription record failed:", subErr.message)
    }
    await recordAdminAudit("plan.update", { type: "user", id: userId }, { plan: newTier })

    revalidatePath("/admin")
    revalidatePath("/admin/users")
    revalidatePath("/admin/subscriptions")
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: publicError(err, "Failed to update user plan.") }
  }
}

// ----------------------------------------------------
// 4. GET STARTUPS LIST
// ----------------------------------------------------
export async function getAdminStartupsList(options?: {
  search?: string
  stageFilter?: string
}): Promise<{ success: true; startups: AdminStartupListItem[] } | { success: false; error: string }> {
  try {
    const supabase = await requireAdmin()

    const { data: startupsData } = await supabase
      .from("startups")
      .select("*")
      .order("created_at", { ascending: false })

    const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUsers = authData?.users || []
    const { data: profiles } = await supabase.from("profiles").select("id, full_name")

    const profileMap = new Map<string, string>()
    profiles?.forEach((p) => {
      if (p.full_name) profileMap.set(p.id, p.full_name)
    })

    let result: AdminStartupListItem[] = (startupsData || []).map((s) => {
      const ownerAuth = authUsers.find((u) => u.id === s.owner_id)
      const ownerName =
        profileMap.get(s.owner_id) ||
        ownerAuth?.user_metadata?.full_name ||
        ownerAuth?.email?.split("@")[0] ||
        "Unknown Owner"

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        ownerId: s.owner_id,
        ownerName,
        ownerEmail: ownerAuth?.email || "N/A",
        countryCode: s.country_code,
        city: s.city,
        industry: s.industry,
        stage: s.stage,
        budgetCurrency: s.budget_currency,
        estimatedBudgetCents: s.estimated_budget_cents,
        onboardingStatus: s.onboarding_status,
        createdAt: s.created_at,
      }
    })

    if (options?.search) {
      const q = options.search.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ownerName.toLowerCase().includes(q) ||
          s.ownerEmail.toLowerCase().includes(q)
      )
    }

    if (options?.stageFilter && options.stageFilter !== "all") {
      result = result.filter((s) => s.stage === options.stageFilter)
    }

    return { success: true, startups: result }
  } catch (err: unknown) {
    return { success: false, error: publicError(err, "Failed to load startups.") }
  }
}

// ----------------------------------------------------
// 5. GET FEEDBACK LIST & UPDATE STATUS
// ----------------------------------------------------
export async function getAdminFeedbackList(options?: {
  category?: string
  search?: string
}): Promise<{ success: true; feedback: AdminFeedbackItem[] } | { success: false; error: string }> {
  try {
    const supabase = await requireAdmin()

    let query = supabase.from("user_feedback").select("*").order("created_at", { ascending: false })

    if (options?.category && options.category !== "all") {
      query = query.eq("category", options.category)
    }

    const { data: rows } = await query

    const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUsers = authData?.users || []
    const { data: profiles } = await supabase.from("profiles").select("id, full_name")

    const profileMap = new Map<string, string>()
    profiles?.forEach((p) => {
      if (p.full_name) profileMap.set(p.id, p.full_name)
    })

    let result: AdminFeedbackItem[] = (rows || []).map((f) => {
      const u = authUsers.find((user) => user.id === f.user_id)
      const name = profileMap.get(f.user_id) || u?.user_metadata?.full_name || u?.email?.split("@")[0] || "Anonymous User"

      return {
        id: f.id,
        userId: f.user_id,
        userName: name,
        userEmail: u?.email || "No email",
        category: f.category,
        message: f.message,
        rating: f.rating,
        pageUrl: f.page_url,
        createdAt: f.created_at,
        status: "open",
      }
    })

    if (options?.search) {
      const q = options.search.toLowerCase()
      result = result.filter(
        (f) =>
          f.message.toLowerCase().includes(q) ||
          f.userName.toLowerCase().includes(q) ||
          f.userEmail.toLowerCase().includes(q)
      )
    }

    return { success: true, feedback: result }
  } catch (err: unknown) {
    return { success: false, error: publicError(err, "Failed to load feedback list.") }
  }
}

// ----------------------------------------------------
// 6. GET SUBSCRIPTIONS MANAGEMENT
// ----------------------------------------------------
export async function getAdminSubscriptions(): Promise<{
  success: true
  subscriptions: AdminSubscriptionItem[]
  stats: {
    mrr: number
    activeCount: number
    tierCounts: Record<UserPlanTier, number>
  }
} | { success: false; error: string }> {
  try {
    const supabase = await requireAdmin()

    const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const users = authData?.users || []
    const { data: profiles } = await supabase.from("profiles").select("id, full_name")

    const profileMap = new Map<string, string>()
    profiles?.forEach((p) => {
      if (p.full_name) profileMap.set(p.id, p.full_name)
    })

    const tierCounts: Record<UserPlanTier, number> = { Free: 0, Pro: 0, Team: 0 }
    let mrr = 0
    let activeCount = 0

    const subscriptions: AdminSubscriptionItem[] = users.map((u) => {
      const tier = getPlanTier(u)
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
      const price = PLAN_LIMITS[tier].monthlyPriceUsd
      if (tier !== "Free") {
        mrr += price
        activeCount++
      }

      const name = profileMap.get(u.id) || u.user_metadata?.full_name || u.email?.split("@")[0] || "User"

      return {
        userId: u.id,
        userName: name,
        userEmail: u.email || "",
        tier,
        status: tier === "Free" ? "trialing" : "active",
        monthlyAmountUsd: price,
        createdAt: u.created_at,
      }
    })

    return {
      success: true,
      subscriptions,
      stats: {
        mrr,
        activeCount,
        tierCounts,
      },
    }
  } catch (err: unknown) {
    return { success: false, error: publicError(err, "Failed to load subscriptions.") }
  }
}

// ----------------------------------------------------
// 7. GET USAGE LOGS
// ----------------------------------------------------
export async function getAdminUsageLogs(): Promise<{
  success: true
  logs: AdminUsageLogItem[]
} | { success: false; error: string }> {
  try {
    const supabase = await requireAdmin()

    const { data: events } = await supabase
      .from("usage_events")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(100)

    const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const users = authData?.users || []
    const userEmailMap = new Map<string, string>()
    users.forEach((u) => userEmailMap.set(u.id, u.email || ""))

    const logs: AdminUsageLogItem[] = (events || []).map((e) => ({
      id: e.id,
      userId: e.user_id,
      userEmail: e.user_id ? userEmailMap.get(e.user_id) : undefined,
      startupId: e.startup_id,
      eventName: e.event_name,
      quantity: e.quantity,
      occurredAt: e.occurred_at,
      metadata: e.metadata,
    }))

    return { success: true, logs }
  } catch (err: unknown) {
    return { success: false, error: publicError(err, "Failed to load usage logs.") }
  }
}
