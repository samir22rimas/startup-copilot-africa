import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { supabaseAdmin } from "@/src/lib/supabase/admin"

/**
 * Get all active projects for a startup.
 */
export async function getProjects(startupId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("startup_id", startupId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getProjects]", error.message)
    return []
  }
  return data ?? []
}

/**
 * Create a new project under a startup.
 */
export async function createProject(input: {
  startup_id: string
  title: string
  description?: string | null
  target_audience?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const payload = {
    startup_id: input.startup_id,
    created_by: user.id,
    title: input.title,
    description: input.description ?? null,
    target_audience: input.target_audience ?? null,
  }

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: adminData, error: adminErr } = await supabaseAdmin
        .from("projects")
        .insert(payload)
        .select()
        .single()
      if (!adminErr && adminData) {
        return adminData
      }
    }
  } catch (e) {
    // Admin client fallback
  }

  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error("[createProject]", error.message)
    return null
  }
  return data
}

/**
 * Get the AI configuration for a project, if one exists.
 */
export async function getAiConfig(projectId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("ai_configurations")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle()

  if (error) {
    console.error("[getAiConfig]", error.message)
    return null
  }
  return data
}

/**
 * Upsert the AI configuration for a project.
 */
export async function upsertAiConfig(input: {
  project_id: string
  primary_use_case: string
  tone_of_voice: string
  model?: string | null
  system_instructions?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("ai_configurations")
    .upsert({
      project_id: input.project_id,
      created_by: user.id,
      primary_use_case: input.primary_use_case,
      tone_of_voice: input.tone_of_voice,
      model: input.model ?? null,
      system_instructions: input.system_instructions ?? null,
    }, { onConflict: "project_id" })
    .select()
    .single()

  if (error) {
    console.error("[upsertAiConfig]", error.message)
    return null
  }
  return data
}
