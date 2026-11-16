"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { LOCALE_COOKIE, isLocale } from "@/src/lib/i18n/config"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

/** Saves the visitor's language choice (cookie, plus their profile when signed in). */
export async function setLocale(locale: string): Promise<{ success: boolean }> {
  if (!isLocale(locale)) return { success: false }

  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      // Ignored when the 2.0 migration has not added the column yet.
      await supabase.from("profiles").update({ preferred_language: locale }).eq("id", user.id)
    }
  } catch {
    // The cookie alone is enough for the language to change.
  }

  revalidatePath("/", "layout")
  return { success: true }
}
