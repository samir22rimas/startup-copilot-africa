import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Proxy: Protect all /dashboard routes.
 * Unauthenticated users are redirected to /sign-in.
 * Authenticated users visiting /sign-in, /sign-up, /forgot-password are
 * redirected to /dashboard to avoid showing auth pages to logged-in users.
 */
export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // Protected routes — require authentication
  if (pathname.startsWith("/dashboard") && !user) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("redirectedFrom", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Auth routes — redirect authenticated users away
  const isAuthRoute =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/login" ||
    pathname === "/forgot-password"

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
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
     *  - /auth/callback (Supabase OAuth & magic-link handler)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth/callback).*)",
  ],
}
