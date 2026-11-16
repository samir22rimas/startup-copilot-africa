"use server";

import { revalidatePath } from "next/cache"

import { writeActiveStartupCookie } from "@/src/lib/active-startup"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { isUuid } from "@/src/lib/validation"

export async function setActiveStartup(
  startupId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isUuid(startupId)) return { success: false, error: "That business is not available." }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Please sign in." }

  // RLS only returns startups the user belongs to.
  const { data: startup } = await supabase
    .from("startups")
    .select("id")
    .eq("id", startupId)
    .maybeSingle()
  if (!startup) return { success: false, error: "That business is not available." }

  await writeActiveStartupCookie(startup.id)
  revalidatePath("/dashboard", "layout")
  return { success: true }
}
