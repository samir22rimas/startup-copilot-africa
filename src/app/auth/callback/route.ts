import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/src/lib/database.types"
import { ROUTES } from "@/src/lib/constants"
import { safePostAuthPath } from "@/src/lib/validation"

/**
 * Handles every Supabase redirect that carries a PKCE `code`: Google OAuth,
 * sign-up email confirmation and password-recovery links.
 *
 * Errors are mapped to fixed codes (never raw provider text) and recovery
 * failures are sent back to the "forgot password" page so the user can simply
 * request a new link.
 */
function errorRedirect(request: NextRequest, isRecovery: boolean, code: string) {
  const target = isRecovery ? ROUTES.forgotPassword : ROUTES.signIn
  return NextResponse.redirect(new URL(`${target}?error=${code}`, request.url))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const next = safePostAuthPath(searchParams.get("next"))
  const isRecoveryHint = next === ROUTES.updatePassword

  const providerError = searchParams.get("error_code") || searchParams.get("error")
  if (providerError) {
    console.error("Auth callback error parameter:", providerError, searchParams.get("error_description"))
    const expired = providerError === "otp_expired" || /expired|invalid/i.test(searchParams.get("error_description") ?? "")
    return errorRedirect(request, isRecoveryHint, expired ? "link-expired" : "oauth")
  }

  if (!code) {
    return errorRedirect(request, isRecoveryHint, "missing-code")
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(new URL(`${ROUTES.signIn}?error=configuration`, request.url))
  }

  const pendingCookies: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = []

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach((cookie) => pendingCookies.push(cookie))
      },
    },
  })

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error("Auth code exchange error:", error.code ?? error.message)
    // Missing/foreign code verifier: the link was opened in a different
    // browser than the one that requested it.
    const otherBrowser = error.code === "bad_code_verifier" || /code verifier/i.test(error.message ?? "")
    const expired = error.code === "flow_state_expired" || error.code === "flow_state_not_found" || error.code === "otp_expired"
    return errorRedirect(request, isRecoveryHint, otherBrowser ? "other-browser" : expired ? "link-expired" : "callback")
  }

  // A recovery link must always end on the "choose a new password" screen,
  // even when Supabase fell back to the Site URL and `next` was lost.
  // (auth-js returns `redirectType` at runtime but omits it from the typings.)
  const redirectType = (data as { redirectType?: string | null }).redirectType
  const destination = redirectType === "recovery" ? ROUTES.updatePassword : next

  const response = NextResponse.redirect(new URL(destination, request.url))
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
