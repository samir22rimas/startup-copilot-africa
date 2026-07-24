import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/src/lib/database.types"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const errorDescription = searchParams.get("error_description") || searchParams.get("error")
  const next = searchParams.get("next") === "/update-password" ? "/update-password" : "/dashboard"

  if (errorDescription) {
    console.error("Auth OAuth callback error parameter:", errorDescription)
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(errorDescription)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing-code", request.url))
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(new URL("/sign-in?error=configuration", request.url))
  }

  const response = NextResponse.redirect(new URL(next, request.url))

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error("Auth code exchange error:", error)
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error.message || "callback")}`, request.url)
    )
  }

  return response
}
