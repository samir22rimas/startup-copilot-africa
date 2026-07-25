"use server"

import { writeActiveProjectCookie } from "@/src/lib/active-project"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function setActiveProject(
  projectId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!projectId) return { success: false, error: "Project id is required." }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Please sign in." }

  const { data: startup } = await supabase
    .from("startups")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!startup) return { success: false, error: "Startup not found." }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle()

  if (!project) return { success: false, error: "That project is not available." }

  await writeActiveProjectCookie(project.id)
  revalidatePath("/dashboard", "layout")
  return { success: true }
}
