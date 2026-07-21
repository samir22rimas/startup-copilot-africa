"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export type AuthState = { error?: string; message?: string }

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120).optional(),
})

function getField(formData: FormData, field: string) {
  return typeof formData.get(field) === "string" ? String(formData.get(field)) : ""
}

async function getOrigin() {
  const requestHeaders = await headers()
  return requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

function getAuthErrorMessage(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? ""

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many email requests were sent recently. Please wait a few minutes before trying again."
  }

  if (message.includes("email")) {
    return "We could not send the email right now. Please wait a moment and try again."
  }

  return null
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

  if (mode === "sign-in") {
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) return { error: "We could not sign you in. Check your email and password." }
    redirect("/dashboard")
  }

  if (mode === "sign-up") {
    if (!parsed.data.fullName) return { error: "Enter your full name." }

    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${await getOrigin()}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      const friendlyError = getAuthErrorMessage(error)
      return { error: friendlyError ?? error.message }
    }
    return { message: "Check your email to confirm your account, then sign in." }
  }

  return { error: "Unknown authentication request." }
}

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await getOrigin()}/auth/callback?next=/dashboard` },
  })

  if (error || !data.url) redirect("/sign-in?error=oauth")
  redirect(data.url)
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = getField(formData, "email")
  const parsed = z.string().trim().email("Enter a valid email address.").safeParse(email)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/update-password`,
  })

  if (error) {
    const friendlyError = getAuthErrorMessage(error)
    return { error: friendlyError ?? "We could not send a reset email. Please try again." }
  }
  return { message: "If an account exists for that email, a reset link is on its way." }
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = getField(formData, "password")
  const confirmation = getField(formData, "confirmation")
  if (password.length < 8) return { error: "Password must be at least 8 characters." }
  if (password !== confirmation) return { error: "Passwords do not match." }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: "Your reset link has expired. Please request a new one." }
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/sign-in")
}
