import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { supabaseAdmin } from "@/src/lib/supabase/admin"
import type { Database } from "@/src/lib/database.types"

type StartupInsert = Database["public"]["Tables"]["startups"]["Insert"]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function getMyStartup() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("startups")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[getMyStartup]", error.message)
    return null
  }
  return data
}

/**
 * THE single startup-creation path. Handles the one real prerequisite
 * for the insert to pass RLS: a profiles row must exist for owner_id
 * (startups.owner_id -> profiles.id FK), so this backfills it via the
 * admin client if the on_auth_user_created trigger hasn't run yet.
 */
export async function createStartup(input: {
  name: string
  country_code: string
  city?: string | null
  industry?: string | null
  estimated_budget_cents?: number | null
  budget_currency?: string
}): Promise<{ startup: Database["public"]["Tables"]["startups"]["Row"] | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { startup: null, error: "Not authenticated." }
  }

  // Ensure a profiles row exists BEFORE inserting into startups —
  // startups.owner_id references profiles(id), and if this trigger
  // didn't fire on signup, the insert below fails RLS/FK either way.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({ id: user.id, full_name: user.user_metadata?.full_name || "Founder" })
    if (profileErr) {
      console.error("[createStartup] profile backfill failed:", profileErr.message)
      return { startup: null, error: `Profile setup failed: ${profileErr.message}` }
    }
  }

  const base = slugify(input.name) || "startup"
  const slug = `${base}-${user.id.slice(0, 6)}`

  const payload: StartupInsert = {
    owner_id: user.id,
    name: input.name,
    slug,
    country_code: input.country_code.toUpperCase(), // schema requires ^[A-Z]{2}$
    city: input.city ?? null,
    industry: input.industry ?? null,
    website_url: null,
    description: null,
    estimated_budget_cents: input.estimated_budget_cents ?? null,
    budget_currency: (input.budget_currency ?? "USD").toUpperCase(),
  }

  // Try insert with admin client first (bypasses RLS timing check during .select() return)
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: adminData, error: adminErr } = await supabaseAdmin
        .from("startups")
        .insert(payload)
        .select()
        .single()
      if (!adminErr && adminData) {
        return { startup: adminData, error: null }
      }
    }
  } catch (e) {
    // Service role key not set or admin insert error — fallback to session client below
  }

  const { data, error } = await supabase.from("startups").insert(payload).select().single()

  if (error) {
    console.error("[createStartup]", error.message)
    return { startup: null, error: error.message }
  }
  return { startup: data, error: null }
}

export async function completeOnboarding(startupId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("startups")
    .update({ onboarding_status: "completed", onboarding_completed_at: new Date().toISOString() })
    .eq("id", startupId)
    .select()
    .single()

  if (error) {
    console.error("[completeOnboarding]", error.message)
    return null
  }
  return data
}