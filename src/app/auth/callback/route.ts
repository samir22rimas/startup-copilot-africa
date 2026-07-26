import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/src/lib/database.types"
import { ROUTES } from "@/src/lib/constants"

const ALLOWED_NEXT_PATHS = new Set<string>([ROUTES.dashboard, ROUTES.updatePassword])

function resolveNextPath(value: string | null) {
  if (!value) return ROUTES.dashboard

  const decoded = decodeURIComponent(value)
  return ALLOWED_NEXT_PATHS.has(decoded) ? decoded : ROUTES.dashboard
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const errorDescription = searchParams.get("error_description") || searchParams.get("error")
  const next = resolveNextPath(searchParams.get("next"))

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
