import { getDashboardData } from "@/src/app/actions/dashboard"
import { getOverview } from "@/src/app/actions/overview"
import { DashboardWorkspace } from "@/src/components/dashboard/DashboardWorkspace"
import { InterviewWorkspace } from "@/src/components/dashboard/InterviewWorkspace"
import { StartupWizard } from "@/src/components/dashboard/StartupWizard"
import { OverviewDashboard } from "@/src/components/dashboard/overview/OverviewDashboard"
import { PendingInvitesBanner } from "@/src/components/dashboard/team/PendingInvitesBanner"
import { Notice } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { isPlatformSchemaReady } from "@/src/lib/workspace/schema-status"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const data = await getDashboardData()
  const { t } = await getI18n()

  if ("error" in data) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t.overview.signInTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.overview.signInBody}</p>
        </div>
      </div>
    )
  }

  // No business (or no first project) yet: create one.
  if (!data.hasStartup || !data.hasProject || !data.startup || !data.project || !data.tasks) {
    return (
      <>
        <PendingInvitesBanner />
        <StartupWizard />
      </>
    )
  }

  const { startup, project, tasks, teamMembers, currentUserId, conversationId, copilotMessages, overview } = data

  // The onboarding interview comes before the dashboard.
  if (startup.onboarding_status !== "completed") {
    return (
      <>
        <PendingInvitesBanner />
        <InterviewWorkspace projectId={project.id} />
      </>
    )
  }

  if (await isPlatformSchemaReady()) {
    const overviewData = await getOverview()
    if (overviewData) {
      return (
        <>
          <PendingInvitesBanner />
          <OverviewDashboard startup={startup} data={overviewData} />
        </>
      )
    }
  }

  // Database not migrated to 2.0 yet: keep the previous dashboard working.
  return (
    <div className="h-full w-full">
      <PendingInvitesBanner />
      <div className="mx-auto mb-4 max-w-7xl">
        <Notice tone="warning" title={t.common.setupTitle}>
          {t.common.setupBody}
        </Notice>
      </div>
      <DashboardWorkspace
        startup={startup}
        project={project}
        initialTasks={tasks}
        teamMembers={teamMembers ?? []}
        currentUserId={currentUserId ?? ""}
        conversationId={conversationId || ""}
        initialMessages={copilotMessages || []}
        overview={overview}
      />
    </div>
  )
}
