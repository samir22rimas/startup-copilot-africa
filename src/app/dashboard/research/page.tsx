import { listReports } from "@/src/app/actions/reports"
import { ReportStudio } from "@/src/components/reports/ReportStudio"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { webSearchConfigured } from "@/src/lib/ai/providers"
import { getI18n } from "@/src/lib/i18n/server"
import { minimumPlanFor, planHasFeature } from "@/src/lib/plans"
import { REPORT_CATALOG } from "@/src/lib/reports/catalog"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function ResearchPage() {
  const page = await loadWorkspacePage({ feature: "market_research" })
  if (!page.ok) return page.element
  const { ws, canEdit } = page
  const { t } = await getI18n()
  const reports = await listReports("research")

  const webNotice = !webSearchConfigured()
    ? ({ kind: "unavailable" } as const)
    : !planHasFeature(ws.tier, "web_research")
      ? ({ kind: "locked", plan: minimumPlanFor("web_research") } as const)
      : null

  return (
    <PageShell>
      <PageHeader eyebrow={t.nav.groupDiscover} title={t.pages.research.title} description={t.pages.research.description} />
      <ReportStudio
        module="research"
        kinds={REPORT_CATALOG.research.map((d) => d.kind)}
        initialReports={reports}
        startupName={ws.startup.name}
        canEdit={canEdit}
        webNotice={webNotice}
      />
    </PageShell>
  )
}
