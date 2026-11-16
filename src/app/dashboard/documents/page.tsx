import { redirect } from "next/navigation"

import { getDashboardData } from "@/src/app/actions/dashboard"
import { listCenterDocuments } from "@/src/app/actions/document-center"
import { listKnowledgeDocuments } from "@/src/app/actions/documents"
import { DocumentVault } from "@/src/components/dashboard/DocumentVault"
import { DocumentCenter } from "@/src/components/dashboard/documents/DocumentCenter"
import { PageHeader, PageShell } from "@/src/components/ui/page"
import { getI18n } from "@/src/lib/i18n/server"
import { roleCan } from "@/src/lib/permissions"
import { requireWorkspace } from "@/src/lib/workspace"
import { isPlatformSchemaReady } from "@/src/lib/workspace/schema-status"

export const dynamic = "force-dynamic"

export default async function DocumentsPage() {
  const data = await getDashboardData()
  if ("error" in data || !data.hasStartup || !data.hasProject || !data.project) {
    redirect("/dashboard")
  }

  // Folders, search and summaries need the 2.0 schema; until it is applied the
  // original vault keeps working.
  const ws = (await isPlatformSchemaReady()) ? await requireWorkspace("view") : null
  if (!ws || "error" in ws) {
    const listed = await listKnowledgeDocuments(data.project.id)
    return <DocumentVault projectId={data.project.id} initialDocuments={listed.success ? listed.documents : []} />
  }

  const { t } = await getI18n()
  const documents = await listCenterDocuments()

  return (
    <PageShell>
      <PageHeader eyebrow={t.nav.groupRun} title={t.documents.title} description={t.documents.description} />
      <DocumentCenter
        initial={documents}
        projects={(data.projects ?? []).map((project) => ({ id: project.id, title: project.title }))}
        defaultProjectId={data.project.id}
        canEdit={roleCan(ws.role, "edit")}
      />
    </PageShell>
  )
}
