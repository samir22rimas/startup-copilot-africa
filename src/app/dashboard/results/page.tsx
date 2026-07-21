import type { ResultsWorkspace as ResultsWorkspaceData } from "@/src/app/actions/results"
import { getDashboardData } from "@/src/app/actions/dashboard"
import { ResultsWorkspace } from "@/src/components/dashboard/ResultsWorkspace"
import { redirect } from "next/navigation"

export default async function ResultsPage() {
  const data = await getDashboardData()
  if ("error" in data || !data.hasStartup || !data.hasProject || !data.startup || !data.project) redirect("/dashboard")
  const metadata = data.project.metadata && typeof data.project.metadata === "object" && !Array.isArray(data.project.metadata) ? data.project.metadata : {}
  const workspace = (metadata as Record<string, unknown>).results_workspace as ResultsWorkspaceData | undefined
  return <ResultsWorkspace projectId={data.project.id} startupName={data.startup.name} initialWorkspace={workspace || null} />
}
