import { getDashboardData } from "@/src/app/actions/dashboard"
import { DashboardWorkspace } from "@/src/components/dashboard/DashboardWorkspace"
import { InterviewWorkspace } from "@/src/components/dashboard/InterviewWorkspace"
import { StartupWizard } from "@/src/components/dashboard/StartupWizard"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const data = await getDashboardData()

  // 1. If not authenticated or error
  if ("error" in data) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="mt-2 text-sm text-zinc-500">Please sign in to view your dashboard.</p>
        </div>
      </div>
    )
  }

  // 2. If user doesn't have a startup or active project yet
  if (!data.hasStartup || !data.hasProject || !data.startup || !data.project || !data.tasks) {
    return <StartupWizard />
  }

  const { startup, project, tasks, conversationId, copilotMessages, overview } = data

  // 4. If startup onboarding/interview is not completed yet
  if (startup.onboarding_status !== "completed") {
    return <InterviewWorkspace projectId={project.id} />
  }

  // 5. Render final dashboard workspace
  return (
    <DashboardWorkspace
      startup={startup}
      project={project}
      initialTasks={tasks}
      conversationId={conversationId || ""}
      initialMessages={copilotMessages || []}
      overview={overview}
    />
  )
}
