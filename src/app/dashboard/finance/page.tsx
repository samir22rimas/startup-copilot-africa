import { redirect } from "next/navigation"

import { getFinancialModel } from "@/src/app/actions/finance"
import { FinanceWorkspace } from "@/src/components/dashboard/finance/FinanceWorkspace"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function FinancePage() {
  const page = await loadWorkspacePage({ feature: "financial_planning" })
  if (!page.ok) return page.element
  const { ws, canEdit } = page
  const { t } = await getI18n()

  const state = await getFinancialModel()
  if (!state) redirect("/dashboard")

  return (
    <PageShell>
      <PageHeader eyebrow={t.nav.groupPlan} title={t.pages.finance.title} description={t.pages.finance.description} />
      <FinanceWorkspace initial={state} startupName={ws.startup.name} canEdit={canEdit} />
    </PageShell>
  )
}
