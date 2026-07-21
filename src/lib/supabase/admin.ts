import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/src/lib/database.types"

/**
 * Supabase Admin client using the SERVICE ROLE key.
 *
 * ⚠️  NEVER expose this client to the browser.
 *     Only import it in Server Actions, Route Handlers, or scripts.
 *     The service role bypasses ALL Row Level Security policies.
 *
 * Lazily created on first call so a missing key causes a clear error
 * only at the point of use, not at module load time (which would crash
 * every page that transitively imports this module).
 */

let _adminClient: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      "[supabase/admin] Missing NEXT_PUBLIC_SUPABASE_URL. " +
        "Add it to .env.local from your Supabase project settings."
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      "[supabase/admin] Missing SUPABASE_SERVICE_ROLE_KEY. " +
        "Go to your Supabase Dashboard → Settings → API → service_role key, " +
        "then add SUPABASE_SERVICE_ROLE_KEY=<key> to .env.local and restart the dev server."
    )
  }

  _adminClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _adminClient
}

/**
 * @deprecated Use `getSupabaseAdmin()` instead.
 * Kept for backwards compatibility — will throw if service role key is absent.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop]
  },
})
