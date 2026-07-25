import { getDashboardData } from "@/src/app/actions/dashboard"
import { LegalWorkspaceUI } from "@/src/components/dashboard/legal/LegalWorkspace"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LegalPage() {
  const data = await getDashboardData()
  if ("error" in data) redirect("/sign-in")
  if (!data.hasStartup || !data.hasProject || !data.startup || !data.project) {
    redirect("/dashboard")
  }

  const metadata =
    data.project.metadata && typeof data.project.metadata === "object" && !Array.isArray(data.project.metadata)
      ? (data.project.metadata as Record<string, unknown>)
      : {}
  const initialWorkspace = metadata.legal_workspace || null

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <LegalWorkspaceUI
        projectId={data.project.id}
        startupName={data.startup.name}
        countryCode={data.startup.country_code}
        industry={data.startup.industry || "General"}
        initialWorkspace={initialWorkspace}
      />
    </div>
  )
}
