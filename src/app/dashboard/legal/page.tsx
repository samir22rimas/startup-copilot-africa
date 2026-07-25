import { getDashboardData } from "@/src/app/actions/dashboard"
import type { LegalWorkspace } from "@/src/app/actions/legal"
import { LegalWorkspaceUI } from "@/src/components/dashboard/legal/LegalWorkspace"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

function isLegalWorkspace(value: unknown): value is LegalWorkspace {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const ws = value as Partial<LegalWorkspace>
  return (
    typeof ws.generatedAt === "string" &&
    typeof ws.countryCode === "string" &&
    typeof ws.recommendedEntityType === "string" &&
    Array.isArray(ws.requiredLicenses) &&
    Array.isArray(ws.setupChecklist)
  )
}

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
  const initialWorkspace = isLegalWorkspace(metadata.legal_workspace)
    ? metadata.legal_workspace
    : null

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
