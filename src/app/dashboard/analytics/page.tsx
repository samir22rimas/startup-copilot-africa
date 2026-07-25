import type { AnalyticsWorkspace as AnalyticsWorkspaceData } from "@/src/app/actions/analytics"
import { getDashboardData } from "@/src/app/actions/dashboard"
import { AnalyticsWorkspace } from "@/src/components/dashboard/analytics/AnalyticsWorkspace"
import { normalizeAnalyticsWorkspace, readTrackedMetrics } from "@/src/lib/data-truth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const data = await getDashboardData()
  if ("error" in data || !data.hasStartup || !data.hasProject || !data.startup || !data.project) {
    redirect("/dashboard")
  }

  const metadata =
    data.project.metadata && typeof data.project.metadata === "object" && !Array.isArray(data.project.metadata)
      ? (data.project.metadata as Record<string, unknown>)
      : {}

  const workspace = normalizeAnalyticsWorkspace(metadata.analytics_workspace) as AnalyticsWorkspaceData | null

  const tracked = readTrackedMetrics(metadata, data.startup.budget_currency || "USD")

  return (
    <AnalyticsWorkspace
      projectId={data.project.id}
      startup={data.startup}
      initialWorkspace={workspace}
      initialTracked={tracked}
    />
  )
}
