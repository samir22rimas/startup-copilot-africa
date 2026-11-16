"use server"

import { writeActiveProjectCookie } from "@/src/lib/active-project"
import { getProjectAccess } from "@/src/lib/workspace-access"
import { revalidatePath } from "next/cache"

export async function setActiveProject(
  projectId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getProjectAccess(projectId)
  if ("error" in access) return { success: false, error: access.error }

  await writeActiveProjectCookie(access.project.id)
  revalidatePath("/dashboard", "layout")
  return { success: true }
}
