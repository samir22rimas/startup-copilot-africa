import { redirect } from "next/navigation"

import { getCanvas } from "@/src/app/actions/canvas"
import { CanvasEditor } from "@/src/components/dashboard/model/CanvasEditor"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function BusinessModelPage() {
  const page = await loadWorkspacePage({ feature: "business_model" })
  if (!page.ok) return page.element
  const { ws, canEdit } = page
  const { t } = await getI18n()

  const [bmc, lean] = await Promise.all([getCanvas("bmc"), getCanvas("lean")])
  if (!bmc || !lean) redirect("/dashboard")

  return (
    <PageShell className="max-w-7xl">
      <PageHeader eyebrow={t.nav.groupPlan} title={t.pages.model.title} description={t.pages.model.description} />
      <CanvasEditor initial={{ bmc, lean }} startupName={ws.startup.name} canEdit={canEdit} />
    </PageShell>
  )
}
