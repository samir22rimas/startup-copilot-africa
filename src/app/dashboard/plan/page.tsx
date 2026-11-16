import Link from "next/link"
import { redirect } from "next/navigation"

import { getPlan, getPlanShareLink } from "@/src/app/actions/business-plan"
import { PlanEditor } from "@/src/components/dashboard/plan/PlanEditor"
import { PageHeader, PageShell, secondaryButtonClass } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { planHasFeature } from "@/src/lib/plans"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function BusinessPlanPage() {
  const page = await loadWorkspacePage({ feature: "business_plan" })
  if (!page.ok) return page.element
  const { ws, canEdit } = page
  const { t } = await getI18n()

  const [plan, share] = await Promise.all([getPlan(), getPlanShareLink()])
  if (!plan) redirect("/dashboard")

  return (
    <PageShell className="max-w-7xl">
      <PageHeader
        eyebrow={t.nav.groupPlan}
        title={t.pages.plan.title}
        description={t.pages.plan.description}
        actions={
          <Link href="/dashboard/results" className={secondaryButtonClass}>
            {t.plan.quickDocs}
          </Link>
        }
      />
      <PlanEditor
        initial={plan}
        initialShare={share}
        startupName={ws.startup.name}
        canEdit={canEdit}
        canShare={ws.unlimited || planHasFeature(ws.tier, "plan_sharing")}
      />
    </PageShell>
  )
}
