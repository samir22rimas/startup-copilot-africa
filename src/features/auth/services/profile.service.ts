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
