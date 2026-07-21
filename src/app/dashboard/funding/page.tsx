import type { FundingWorkspace as FundingWorkspaceData } from "@/src/app/actions/funding"
import { getDashboardData } from "@/src/app/actions/dashboard"
import { FundingWorkspace } from "@/src/components/dashboard/funding/FundingWorkspace"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function FundingPage() {
  const data = await getDashboardData()
  if ("error" in data || !data.hasStartup || !data.hasProject || !data.startup || !data.project) {
    redirect("/dashboard")
  }

  const metadata = data.project.metadata && typeof data.project.metadata === "object" && !Array.isArray(data.project.metadata) 
    ? data.project.metadata 
    : {}

  const workspace = (metadata as Record<string, any>).funding_workspace as FundingWorkspaceData | undefined

  return (
    <FundingWorkspace 
      projectId={data.project.id} 
      startup={data.startup} 
      initialWorkspace={workspace || null} 
    />
  )
}
