import { createSupabaseServerClient } from "@/src/lib/supabase/server"

/** Postgres / PostgREST codes for "this table does not exist". */
export function isMissingTableError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205"
}

let ready = false
let checkedAt = 0

/**
 * Whether the Anza 2.0 migration has been applied to the connected database.
 * Until it has, 2.0 pages show a setup notice instead of failing. A positive
 * answer is cached for the life of the process; a negative one for 30 seconds.
 */
export async function isPlatformSchemaReady(): Promise<boolean> {
  if (ready) return true
  if (Date.now() - checkedAt < 30_000) return false

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("artifacts").select("id", { head: true, count: "exact" }).limit(1)
  checkedAt = Date.now()
  ready = !isMissingTableError(error)
  return ready
}
