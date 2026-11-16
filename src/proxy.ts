import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { safePostAuthPath } from "@/src/lib/validation"

/**
 * Proxy: protect all /dashboard and /admin routes.
 * Unauthenticated users are redirected to /sign-in.
 * Authenticated users visiting /sign-in, /sign-up, /forgot-password are
 * redirected to /dashboard (or a validated `next` path, e.g. an invitation)
 * to avoid showing auth pages to logged-in users.
 *
 * This is a first line of defence only: every page and server action also
 * verifies the session itself, and row-level security guards the data.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Supabase may fall back to Site URL (e.g. /) when /auth/callback is not whitelisted.
  // Expired/invalid email links arrive the same way, carrying `error_code`.
  const oauthCode = searchParams.get("code")
  const authErrorCode = searchParams.get("error_code")
  if ((oauthCode || authErrorCode) && !pathname.startsWith("/auth/")) {
    const callbackUrl = new URL("/auth/callback", request.url)
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    // Keep the page the link landed on (e.g. /update-password) as the destination.
    callbackUrl.searchParams.set("next", safePostAuthPath(searchParams.get("next") ?? pathname))
    return NextResponse.redirect(callbackUrl)
  }

  const response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing, allow the request through so Next.js can surface
  // a clear configuration error to the developer.
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Refresh the session on every request so it never silently expires.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes — require authentication
  const isProtected =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")

  if (isProtected && !user) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("redirectedFrom", pathname)
    // Honoured after sign-in only when it is a known safe path.
    const safeNext = safePostAuthPath(pathname, "")
    if (safeNext) signInUrl.searchParams.set("next", safeNext)
    return NextResponse.redirect(signInUrl)
  }

  // Auth routes — redirect authenticated users away (except password recovery)
  const isAuthRoute =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/login" ||
    pathname === "/forgot-password"

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL(safePostAuthPath(searchParams.get("next")), request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *  - _next/static (static files)
     *  - _next/image (image optimisation)
     *  - favicon.ico
     *  - public assets (images, etc.)
     *  - /auth/callback, /auth/confirm (Supabase OAuth & email-link handlers)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth/callback|auth/confirm).*)",
  ],
}
