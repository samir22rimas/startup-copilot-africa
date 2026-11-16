import { listReports } from "@/src/app/actions/reports"
import { getValidationData } from "@/src/app/actions/validation"
import { ValidationWorkspace } from "@/src/components/dashboard/validation/ValidationWorkspace"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { REPORT_CATALOG } from "@/src/lib/reports/catalog"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function ValidationPage() {
  const page = await loadWorkspacePage({ feature: "validation" })
  if (!page.ok) return page.element
  const { ws, canEdit } = page
  const { t } = await getI18n()
  const [reports, data] = await Promise.all([listReports("validation"), getValidationData()])

  return (
    <PageShell>
      <PageHeader eyebrow={t.nav.groupDiscover} title={t.pages.validation.title} description={t.pages.validation.description} />
      <ValidationWorkspace
        initial={data}
        canEdit={canEdit}
        studio={{
          module: "validation",
          kinds: REPORT_CATALOG.validation.map((d) => d.kind),
          initialReports: reports,
          startupName: ws.startup.name,
          canEdit,
        }}
      />
    </PageShell>
  )
}
