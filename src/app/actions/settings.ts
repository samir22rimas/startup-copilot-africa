"use server"

import { revalidatePath } from "next/cache"
import { updateProfile } from "@/src/features/auth/services/profile.service"
import type { StartupStage } from "@/src/lib/database.types"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

const STAGES: StartupStage[] = ["idea", "validation", "mvp", "early_revenue", "growth", "scale"]

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

  const result = await updateProfile({
    full_name: formData.fullName || null,
    phone: formData.phone || null,
    city: formData.city || null,
    country_code: formData.countryCode || null,
    timezone: formData.timezone || "UTC",
    avatar_url: formData.avatarUrl || null,
  })

  if (!result) {
    throw new Error("Failed to update profile settings.")
  }

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard", "layout")
  return { success: true }
}

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
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const name = formData.name.trim()
  if (!name) return { success: false, error: "Startup name is required." }

  const countryCode = formData.countryCode.trim().toUpperCase().slice(0, 2)
  if (countryCode.length !== 2) {
    return { success: false, error: "Country code must be 2 letters (e.g. NG, KE, ZA)." }
  }

  if (!STAGES.includes(formData.stage)) {
    return { success: false, error: "Invalid startup stage." }
  }

  const currency = (formData.budgetCurrency || "USD").trim().toUpperCase().slice(0, 8)
  const estimatedBudgetCents = Math.max(0, Math.round((Number(formData.estimatedBudget) || 0) * 100))

  const { data: startup } = await supabase
    .from("startups")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!startup) return { success: false, error: "No startup found to update." }

  const { error } = await supabase
    .from("startups")
    .update({
      name,
      industry: formData.industry.trim() || null,
      city: formData.city.trim() || null,
      country_code: countryCode,
      stage: formData.stage,
      budget_currency: currency,
      estimated_budget_cents: estimatedBudgetCents,
      description: formData.description.trim() || null,
      website_url: formData.websiteUrl.trim() || null,
    })
    .eq("id", startup.id)
    .eq("owner_id", user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard", "layout")
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/legal")
  revalidatePath("/dashboard/funding")
  revalidatePath("/dashboard/analytics")
  return { success: true }
}
