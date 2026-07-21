import { createSupabaseServerClient } from "@/src/lib/supabase/server"

/**
 * Fetch the current user's profile. Returns null if not authenticated.
 */
export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    console.error("[getCurrentProfile]", error.message)
    return null
  }
  return data
}

/**
 * Update the current user's profile fields.
 */
export async function updateProfile(updates: {
  full_name?: string | null
  avatar_url?: string | null
  phone?: string | null
  country_code?: string | null
  city?: string | null
  timezone?: string
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single()

  if (error) {
    console.error("[updateProfile]", error.message)
    return null
  }
  return data
}

/**
 * Fetch all startups the current user is a member of.
 */
export async function getUserStartups() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("startup_members")
    .select("startups(*)")
    .eq("user_id", user.id)

  if (error) {
    console.error("[getUserStartups]", error.message)
    return []
  }

  // Flatten the joined rows
  return (data ?? []).map((m) => (m as { startups: unknown }).startups).filter(Boolean)
}

/**
 * Create a new startup. The DB trigger `add_startup_owner` automatically
 * inserts the creator as an owner in startup_members.
 */
export async function createStartup(input: {
  name: string
  country_code: string
  city?: string | null
  industry?: string | null
  description?: string | null
  website_url?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const slug = input.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const { data, error } = await supabase
    .from("startups")
    .insert({
      name: input.name,
      slug,
      owner_id: user.id,
      country_code: input.country_code,
      city: input.city ?? null,
      industry: input.industry ?? null,
      estimated_budget_cents: null,
      description: input.description ?? null,
      website_url: input.website_url ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("[createStartup]", error.message)
    return null
  }
  return data
}
