import { redirect } from "next/navigation"

import { getExecutionData } from "@/src/app/actions/execution"
import { ProjectsWorkspace } from "@/src/components/dashboard/projects/ProjectsWorkspace"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { loadWorkspacePage } from "@/src/lib/workspace/page"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const page = await loadWorkspacePage({ feature: "projects" })
  if (!page.ok) return page.element
  const { t } = await getI18n()

  const data = await getExecutionData()
  if (!data) redirect("/dashboard")

  return (
    <PageShell className="max-w-7xl">
      <PageHeader eyebrow={t.nav.groupRun} title={t.pages.projects.title} description={t.pages.projects.description} />
      <ProjectsWorkspace data={data} canEdit={page.canEdit} canComment={page.canComment} />
    </PageShell>
  )
}
