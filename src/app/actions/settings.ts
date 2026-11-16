"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { updateProfile } from "@/src/features/auth/services/profile.service"
import type { StartupStage } from "@/src/lib/database.types"
import { currentQuotaWindowStart, getPlanLimits, getPlanTier, nextQuotaReset, type UserPlanTier } from "@/src/lib/plans"
import { getMonthlyAiUsage } from "@/src/lib/rate-limiter"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { safeHttpUrl } from "@/src/lib/validation"
import { canManageStartup, getActiveStartupAccess } from "@/src/lib/workspace-access"

const STAGES = ["idea", "validation", "mvp", "early_revenue", "growth", "scale"] as const satisfies readonly StartupStage[]

/** Inline avatars are resized in the browser first; this caps what we store. */
const MAX_AVATAR_DATA_URL_LENGTH = 300_000
const AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/

function sanitizeAvatar(value: string | undefined): { ok: true; value: string | null } | { ok: false } {
  const raw = (value ?? "").trim()
  if (!raw) return { ok: true, value: null }
  if (raw.startsWith("data:")) {
    return raw.length <= MAX_AVATAR_DATA_URL_LENGTH && AVATAR_DATA_URL.test(raw)
      ? { ok: true, value: raw }
      : { ok: false }
  }
  const url = safeHttpUrl(raw, 1000)
  return url && url.startsWith("https://") ? { ok: true, value: url } : { ok: false }
}

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const profileSchema = z.object({
  fullName: z.string().trim().max(120, "Name is too long."),
  phone: z
    .string()
    .trim()
    .max(32, "Phone number is too long.")
    .regex(/^[0-9+()\-.\s]*$/, "Phone number can only contain digits, spaces and + ( ) - ."),
  city: z.string().trim().max(120, "City is too long."),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2})?$/, "Choose a valid country.")
    .optional(),
  timezone: z.string().trim().max(64),
  avatarUrl: z.string().optional(),
})

export async function updateUserSettings(formData: {
  fullName: string
  phone: string
  city: string
  countryCode?: string
  timezone: string
  avatarUrl?: string
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  const parsed = profileSchema.safeParse(formData)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Check your details and try again.")
  }

  const avatar = sanitizeAvatar(parsed.data.avatarUrl)
  if (!avatar.ok) {
    throw new Error("That photo could not be used. Choose a JPG, PNG, WebP or GIF image.")
  }

  const result = await updateProfile({
    full_name: parsed.data.fullName || null,
    phone: parsed.data.phone || null,
    city: parsed.data.city || null,
    country_code: parsed.data.countryCode || null,
    timezone: parsed.data.timezone && isValidTimezone(parsed.data.timezone) ? parsed.data.timezone : "UTC",
    avatar_url: avatar.value,
  })

  if (!result) {
    throw new Error("Failed to update profile settings.")
  }

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard", "layout")
  return { success: true }
}

const startupSchema = z.object({
  name: z.string().trim().min(2, "Startup name must be at least 2 characters.").max(120, "Startup name is too long."),
  industry: z.string().trim().max(120),
  city: z.string().trim().max(120),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Country code must be 2 letters (e.g. NG, KE, ZA)."),
  stage: z.enum(STAGES, { message: "Invalid startup stage." }),
  budgetCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code (e.g. USD, KES, NGN)."),
  estimatedBudget: z.number().min(0, "Budget cannot be negative.").max(1e13, "Budget is too large."),
  description: z.string().trim().max(4000, "Description is too long."),
  websiteUrl: z.string().trim().max(500),
})

export async function updateStartupSettings(formData: {
  name: string
  industry: string
  city: string
  countryCode: string
  stage: StartupStage
  budgetCurrency: string
  estimatedBudget: number
  description: string
  websiteUrl: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = startupSchema.safeParse({
    ...formData,
    budgetCurrency: formData?.budgetCurrency || "USD",
    estimatedBudget: Number(formData?.estimatedBudget) || 0,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details and try again." }
  }

  let websiteUrl: string | null = null
  if (parsed.data.websiteUrl) {
    websiteUrl = safeHttpUrl(parsed.data.websiteUrl)
    if (!websiteUrl) return { success: false, error: "Website must be a valid http(s) address." }
  }

  // The startup selected in the sidebar — not just "the newest one I own".
  const access = await getActiveStartupAccess()
  if ("error" in access) return { success: false, error: access.error }
  if (!canManageStartup(access.role)) {
    return { success: false, error: "Only the owner and co-founder admins can change startup details." }
  }

  const { data: updated, error } = await access.supabase
    .from("startups")
    .update({
      name: parsed.data.name,
      industry: parsed.data.industry || null,
      city: parsed.data.city || null,
      country_code: parsed.data.countryCode,
      stage: parsed.data.stage,
      budget_currency: parsed.data.budgetCurrency,
      estimated_budget_cents: Math.round(parsed.data.estimatedBudget * 100),
      description: parsed.data.description || null,
      website_url: websiteUrl,
    })
    .eq("id", access.startup.id)
    .select("id")

  if (error || !updated?.length) {
    if (error) console.error("updateStartupSettings", error.message)
    return { success: false, error: "Could not save startup details. Please try again." }
  }

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard", "layout")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/legal")
  revalidatePath("/dashboard/funding")
  revalidatePath("/dashboard/analytics")
  return { success: true }
}

export interface PlanUsage {
  tier: UserPlanTier
  aiUsed: number
  aiLimit: number
  teamSeats: number
  startupLimit: number
  windowStart: string
  resetsAt: string
}

/** The signed-in user's plan and how much of this month's AI allowance is used. */
export async function getPlanUsage(): Promise<PlanUsage | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const tier = getPlanTier(user)
  const limits = getPlanLimits(tier)
  return {
    tier,
    aiUsed: await getMonthlyAiUsage(user.id),
    aiLimit: limits.monthlyAiGenerations,
    teamSeats: limits.teamSeats,
    startupLimit: limits.startups,
    windowStart: currentQuotaWindowStart().toISOString(),
    resetsAt: nextQuotaReset().toISOString(),
  }
}
