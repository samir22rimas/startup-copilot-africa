import { readActiveStartupCookie, resolveActiveStartup } from "@/src/lib/active-startup"
import type { Database } from "@/src/lib/database.types"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

type StartupInsert = Database["public"]["Tables"]["startups"]["Insert"]
type StartupRow = Database["public"]["Tables"]["startups"]["Row"]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60)
    .replace(/-$/, "")
}

/**
 * Every startup the signed-in user belongs to — as owner, co-founder or team
 * member. Row-level security does the filtering, so this is exactly the set
 * of workspaces the user is allowed to open.
 */
export async function getAllMyStartups(): Promise<StartupRow[]> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("startups")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getAllMyStartups]", error.message)
    return []
  }
  return data || []
}

export async function getMyStartup() {
  const startups = await getAllMyStartups()
  if (startups.length === 0) return null

  const preferredId = await readActiveStartupCookie()
  return resolveActiveStartup(startups, preferredId)
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
}): Promise<{ startup: StartupRow | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { startup: null, error: "Not authenticated." }
  }

  // Ensure a profiles row exists BEFORE inserting into startups —
  // startups.owner_id references profiles(id).
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Founder"
    const { error: profileErr } = await getSupabaseAdmin()
      .from("profiles")
      .insert({ id: user.id, full_name: fullName.slice(0, 120) })
    if (profileErr) {
      console.error("[createStartup] profile backfill failed:", profileErr.message)
      return { startup: null, error: "We could not set up your profile. Please try again." }
    }
  }

  const base = slugify(input.name) || "startup"
  const slug = `${base}-${crypto.randomUUID().slice(0, 8)}`

  const payload: StartupInsert = {
    // Always the caller — never taken from input.
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

  // Preferred path: the user's own session, checked by row-level security.
  const { data, error } = await supabase.from("startups").insert(payload).select().single()
  if (!error && data) return { startup: data, error: null }

  // Fallback for databases that have not yet applied the migration letting an
  // owner read their startup in the same statement that creates it. Safe:
  // owner_id above is forced to the authenticated user.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: adminData, error: adminErr } = await getSupabaseAdmin()
      .from("startups")
      .insert(payload)
      .select()
      .single()
    if (!adminErr && adminData) return { startup: adminData, error: null }
    if (adminErr) console.error("[createStartup] admin fallback:", adminErr.message)
  }

  if (error) console.error("[createStartup]", error.message)
  return { startup: null, error: "We could not create your startup. Please try again." }
}
