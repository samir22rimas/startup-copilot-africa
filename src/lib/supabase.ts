import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/src/lib/database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase public key.")
}

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey)
