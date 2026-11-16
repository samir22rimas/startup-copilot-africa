import { listOpportunities } from "@/src/app/actions/opportunities"
import { OpportunitiesWorkspace } from "@/src/components/dashboard/opportunities/OpportunitiesWorkspace"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function OpportunitiesPage() {
  const page = await loadWorkspacePage()
  if (!page.ok) return page.element
  const { ws, canEdit } = page
  const { t } = await getI18n()
  const { opportunities, tracking } = await listOpportunities()

  return (
    <PageShell>
      <PageHeader eyebrow={t.nav.groupGrow} title={t.pages.opportunities.title} description={t.pages.opportunities.description} />
      <OpportunitiesWorkspace
        opportunities={opportunities}
        initialTracking={tracking}
        business={{ countryCode: ws.startup.country_code, stage: ws.startup.stage, industry: ws.startup.industry }}
        canEdit={canEdit}
      />
    </PageShell>
  )
}
