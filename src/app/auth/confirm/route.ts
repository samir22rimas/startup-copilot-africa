import type { EmailOtpType } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/src/lib/database.types"
import { ROUTES } from "@/src/lib/constants"
import { safePostAuthPath } from "@/src/lib/validation"

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"]

/**
 * Token-hash email links (`/auth/confirm?token_hash=…&type=…`).
 *
 * Unlike the PKCE `code` links handled by /auth/callback, these work when the
 * email is opened on another device or browser. To use them, point the
 * Supabase email templates here, e.g. for "Reset password":
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 * and for "Confirm signup":
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tokenHash = searchParams.get("token_hash")
  const rawType = searchParams.get("type")
  const type = EMAIL_OTP_TYPES.find((t) => t === rawType)
  const isRecovery = type === "recovery"
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`${isRecovery ? ROUTES.forgotPassword : ROUTES.signIn}?error=${code}`, request.url))

  if (!tokenHash || !type) return fail("missing-code")

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.redirect(new URL(`${ROUTES.signIn}?error=configuration`, request.url))

  const pendingCookies: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = []
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach((cookie) => pendingCookies.push(cookie))
      },
    },
  })

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) {
    console.error("Auth token-hash verification error:", error.code ?? error.message)
    return fail("link-expired")
  }

  const destination = isRecovery ? ROUTES.updatePassword : safePostAuthPath(searchParams.get("next"))
  const response = NextResponse.redirect(new URL(destination, request.url))
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
