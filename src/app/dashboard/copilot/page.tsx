import { listCopilotConversations, listMemory } from "@/src/app/actions/copilot"
import { CopilotWorkspace } from "@/src/components/dashboard/copilot/CopilotWorkspace"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { minimumPlanFor, planHasFeature } from "@/src/lib/plans"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function CopilotPage() {
  const page = await loadWorkspacePage({ feature: "copilot" })
  if (!page.ok) return page.element
  const { ws, canEdit } = page
  const { t } = await getI18n()
  const [conversations, memory] = await Promise.all([listCopilotConversations(), listMemory()])

  return (
    <PageShell className="max-w-7xl space-y-4 pb-4">
      <PageHeader title={t.pages.copilot.title} description={t.pages.copilot.description} />
      <CopilotWorkspace
        initialConversations={conversations}
        initialMemory={memory}
        canEdit={canEdit}
        specialistsEnabled={ws.unlimited || planHasFeature(ws.tier, "copilot_specialists")}
        memoryEnabled={ws.unlimited || planHasFeature(ws.tier, "copilot_memory")}
        upgradePlan={minimumPlanFor("copilot_specialists")}
      />
    </PageShell>
  )
}
