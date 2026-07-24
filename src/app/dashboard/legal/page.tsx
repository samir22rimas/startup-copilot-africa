import { LegalWorkspaceUI } from "@/src/components/dashboard/legal/LegalWorkspace"
import { getProjects } from "@/src/features/business/services/project.service"
import { getMyStartup } from "@/src/features/business/services/startup.service"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LegalPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in")

  const startup = await getMyStartup()
  if (!startup) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">No Startup Found</h2>
        <p className="mt-2 text-sm text-zinc-500">Please complete startup onboarding first.</p>
      </div>
    )
  }

  const projects = await getProjects(startup.id)
  if (projects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">No Project Found</h2>
        <p className="mt-2 text-sm text-zinc-500">Please create a project first.</p>
      </div>
    )
  }

  const project = projects[0]
  const metadata = (project.metadata as any) || {}
  const initialWorkspace = metadata.legal_workspace || null

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <LegalWorkspaceUI
        projectId={project.id}
        startupName={startup.name}
        countryCode={startup.country_code}
        industry={startup.industry || "General"}
        initialWorkspace={initialWorkspace}
      />
    </div>
  )
}
