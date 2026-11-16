import { Database, Lock } from "lucide-react"
import { redirect } from "next/navigation"

import { EmptyState, PageShell, Panel } from "@/src/components/ui/page"
import { fmt } from "@/src/lib/i18n/config"
import { getI18n } from "@/src/lib/i18n/server"
import { roleCan } from "@/src/lib/permissions"
import { minimumPlanFor, planHasFeature, type Feature } from "@/src/lib/plans"
import { requireWorkspace, type Workspace } from "@/src/lib/workspace"
import { isPlatformSchemaReady } from "@/src/lib/workspace/schema-status"

export type WorkspacePage =
  | { ok: true; ws: Workspace; canEdit: boolean; canComment: boolean }
  | { ok: false; element: React.ReactElement }

/**
 * Common start of every 2.0 workspace page: resolves the active business,
 * and returns a ready-made screen when the page cannot be shown (database not
 * migrated yet, or the plan does not include the feature).
 */
export async function loadWorkspacePage(options: { feature?: Feature } = {}): Promise<WorkspacePage> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) redirect("/dashboard")

  const { t } = await getI18n()

  if (!(await isPlatformSchemaReady())) {
    return {
      ok: false,
      element: (
        <PageShell>
          <Panel>
            <EmptyState icon={Database} title={t.common.setupTitle} description={t.common.setupBody} />
          </Panel>
        </PageShell>
      ),
    }
  }

  if (options.feature) {
    // A platform admin can switch a feature off for everyone (admin → Features).
    const { data: flag } = await ws.supabase.from("feature_flags").select("enabled").eq("key", options.feature).maybeSingle()
    if (!ws.unlimited && flag && flag.enabled === false) {
      return {
        ok: false,
        element: (
          <PageShell>
            <Panel>
              <EmptyState icon={Lock} title={t.common.featureOffTitle} description={t.common.featureOffBody} />
            </Panel>
          </PageShell>
        ),
      }
    }
  }

  if (options.feature && !ws.unlimited && !planHasFeature(ws.tier, options.feature)) {
    return {
      ok: false,
      element: (
        <PageShell>
          <Panel>
            <EmptyState
              icon={Lock}
              title={fmt(t.common.upgradeTitle, { plan: minimumPlanFor(options.feature) })}
              description={t.common.upgradeBody}
            />
          </Panel>
        </PageShell>
      ),
    }
  }

  return { ok: true, ws, canEdit: roleCan(ws.role, "edit"), canComment: roleCan(ws.role, "comment") }
}
