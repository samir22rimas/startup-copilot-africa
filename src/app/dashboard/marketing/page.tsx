import { redirect } from "next/navigation"

import { getDashboardData } from "@/src/app/actions/dashboard"
import { listReports } from "@/src/app/actions/reports"
import { AiGenerator } from "@/src/components/dashboard/marketing/AiGenerator"
import { MarketingProvider } from "@/src/components/dashboard/marketing/MarketingContext"
import { SocialPlanner } from "@/src/components/dashboard/marketing/SocialPlanner"
import { UpcomingContent } from "@/src/components/dashboard/marketing/UpcomingContent"
import { ReportStudio } from "@/src/components/reports/ReportStudio"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { REPORT_CATALOG } from "@/src/lib/reports/catalog"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function MarketingPage() {
  const page = await loadWorkspacePage({ feature: "marketing_studio" })
  if (!page.ok) return page.element
  const { ws, canEdit } = page

  const data = await getDashboardData()
  if ("error" in data || !data.hasStartup || !data.hasProject || !data.startup || !data.project || !data.overview) {
    redirect("/dashboard")
  }

  const { t } = await getI18n()
  const { marketing } = data.overview
  const reports = await listReports("marketing")

  return (
    <MarketingProvider
      projectId={data.project.id}
      initialEvents={marketing.events}
      initialUpcoming={marketing.upcoming}
      initialKpis={marketing.kpis}
      initialStrategy={marketing.strategyItems}
    >
      <PageShell>
        <PageHeader eyebrow={t.nav.groupRun} title={t.pages.marketing.title} description={t.pages.marketing.description} />

        <section aria-labelledby="marketing-strategy" className="space-y-3">
          <h2 id="marketing-strategy" className="text-sm font-semibold text-foreground">
            {t.marketing.strategyHeading}
          </h2>
          <ReportStudio
            module="marketing"
            kinds={REPORT_CATALOG.marketing.map((d) => d.kind)}
            initialReports={reports}
            startupName={ws.startup.name}
            canEdit={canEdit}
          />
        </section>

        <section aria-labelledby="marketing-content" className="space-y-3">
          <h2 id="marketing-content" className="text-sm font-semibold text-foreground">
            {t.marketing.contentHeading}
          </h2>
          <AiGenerator canEdit={canEdit} />
          <p className="text-xs text-muted-foreground">{t.marketing.plannerNote}</p>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SocialPlanner />
            <UpcomingContent />
          </div>
        </section>
      </PageShell>
    </MarketingProvider>
  )
}
