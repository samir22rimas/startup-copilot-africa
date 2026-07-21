import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/src/lib/database.types"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = request.nextUrl.searchParams.get("next") === "/update-password" ? "/update-password" : "/dashboard"
  const response = NextResponse.redirect(new URL(next, request.url))

  if (!code) return NextResponse.redirect(new URL("/sign-in?error=missing-code", request.url))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.redirect(new URL("/sign-in?error=configuration", request.url))

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL("/sign-in?error=callback", request.url))
  return response
}
