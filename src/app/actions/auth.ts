"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { authCallbackUrl, getSiteUrl, passwordResetCallbackUrl } from "@/src/lib/site-url"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { safePostAuthPath } from "@/src/lib/validation"

export type AuthState = {
  error?: string
  message?: string
  /** Set when sign-in failed only because the email is not confirmed yet. */
  unconfirmedEmail?: string
}

type AuthErrorLike = { message?: string; status?: number; code?: string } | null | undefined

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254)
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")

const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2, "Enter your full name.").max(120).optional(),
})

function getField(formData: FormData, field: string) {
  const value = formData.get(field)
  return typeof value === "string" ? value : ""
}

function isRateLimited(error: AuthErrorLike) {
  const message = error?.message?.toLowerCase() ?? ""
  return (
    error?.status === 429 ||
    error?.code === "over_email_send_rate_limit" ||
    error?.code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  )
}

/** Friendly text for failures common to every auth call; null when not recognised. */
function getAuthErrorMessage(error: AuthErrorLike) {
  const message = error?.message?.toLowerCase() ?? ""
  const status = error?.status

  if (isRateLimited(error)) {
    return "Too many requests were sent recently. Please wait a few minutes before trying again."
  }

  // Supabase 500 / empty response — SDK surfaces this as message "{}" or an empty string
  if ((status !== undefined && status >= 500) || message === "{}" || message === "") {
    return "Something went wrong on our end. Please try again in a moment."
  }

  if (error?.code === "email_address_invalid" || error?.code === "email_address_not_authorized") {
    return "That email address cannot be used. Please try a different one."
  }

  if (error?.code === "signup_disabled" || error?.code === "email_provider_disabled") {
    return "Email sign-up is currently disabled. Please continue with Google or contact support."
  }

  if (message.includes("error sending") || message.includes("smtp")) {
    return "We could not send the email right now. Please wait a moment and try again."
  }

  return null
}

/** Supabase password-policy errors are safe to show (they never reveal account existence). */
function passwordPolicyMessage(error: AuthErrorLike) {
  if (error?.code === "weak_password") {
    return "That password is too weak. Use a longer password mixing letters, numbers and symbols."
  }
  const raw = typeof error?.message === "string" ? error.message : ""
  return /password/i.test(raw) && raw.length < 200 ? raw : null
}

export async function submitAuth(_: AuthState, formData: FormData): Promise<AuthState> {
  const mode = getField(formData, "mode")
  const parsed = credentialsSchema.safeParse({
    email: getField(formData, "email"),
    password: getField(formData, "password"),
    fullName: getField(formData, "fullName") || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." }
  }

  const supabase = await createSupabaseServerClient()
  // Where to land afterwards (e.g. a team invitation) — validated, never an open redirect.
  const next = safePostAuthPath(getField(formData, "next"))

  if (mode === "sign-in") {
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) {
      // Supabase only reports this after the password matched, so it does not
      // leak whether an account exists to someone without the password.
      if (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message ?? "")) {
        return {
          error: "Please confirm your email address first. Check your inbox (and spam folder) for the confirmation link.",
          unconfirmedEmail: parsed.data.email,
        }
      }
      if (isRateLimited(error)) return { error: getAuthErrorMessage(error)! }
      if (error.status !== undefined && error.status >= 500) return { error: getAuthErrorMessage(error)! }
      return { error: "Incorrect email or password. Try again, or use “Forgot?” to reset it." }
    }
    redirect(next)
  }

  if (mode === "sign-up") {
    if (!parsed.data.fullName) return { error: "Enter your full name." }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: authCallbackUrl(await getSiteUrl(), next),
      },
    })

    if (error) {
      // Only password-policy messages are passed through; anything else stays
      // generic so the form never reveals whether an account already exists.
      return {
        error: getAuthErrorMessage(error) ?? passwordPolicyMessage(error) ?? "Sign up failed. Please try again.",
      }
    }

    // Email confirmation disabled in Supabase: the user is already signed in.
    if (data.session) redirect(next)

    return {
      message: `We sent a confirmation link to ${parsed.data.email}. Open it to activate your account, then sign in.`,
      unconfirmedEmail: parsed.data.email,
    }
  }

  return { error: "Unknown authentication request." }
}

export async function resendConfirmation(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(getField(formData, "email"))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const next = safePostAuthPath(getField(formData, "next"))
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: authCallbackUrl(await getSiteUrl(), next) },
  })

  if (error && (isRateLimited(error) || (error.status !== undefined && error.status >= 500))) {
    return { error: getAuthErrorMessage(error)!, unconfirmedEmail: parsed.data }
  }
  // Other errors are not surfaced so the response never reveals whether an account exists.
  return { message: "A new confirmation email is on its way. It can take a minute to arrive.", unconfirmedEmail: parsed.data }
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(getField(formData, "email"))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: passwordResetCallbackUrl(await getSiteUrl()),
  })

  if (error) {
    console.error("Password reset request error:", error.code ?? error.message)
    const friendlyError = getAuthErrorMessage(error)
    // Unknown errors (e.g. user not found on some configurations) are hidden.
    if (friendlyError) return { error: friendlyError }
  }
  return {
    message: `If an account exists for ${parsed.data}, a reset link is on its way. Open it in this same browser — it expires in 1 hour.`,
  }
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = getField(formData, "password")
  const confirmation = getField(formData, "confirmation")
  const parsed = passwordSchema.safeParse(password)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  if (password !== confirmation) return { error: "Passwords do not match." }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Your reset link has expired or is invalid. Please request a new one." }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error("Password update error:", error.code ?? error.message)
    if (error.code === "same_password") {
      return { error: "Your new password must be different from your current one." }
    }
    if (error.code === "reauthentication_needed" || error.code === "session_expired" || error.code === "session_not_found") {
      return { error: "Your reset link has expired. Please request a new one." }
    }
    return {
      error: getAuthErrorMessage(error) ?? passwordPolicyMessage(error) ?? "We could not update your password. Please try again.",
    }
  }

  // Sign out every other device that might still hold the old credentials.
  await supabase.auth.signOut({ scope: "others" })
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/sign-in")
}
