import { listKnowledgeDocuments } from "@/src/app/actions/documents"
import { getDashboardData } from "@/src/app/actions/dashboard"
import { DocumentVault } from "@/src/components/dashboard/DocumentVault"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DocumentsPage() {
  const data = await getDashboardData()
  if ("error" in data || !data.hasStartup || !data.hasProject || !data.project) {
    redirect("/dashboard")
  }

  const listed = await listKnowledgeDocuments(data.project.id)
  const documents = listed.success ? listed.documents : []

  return <DocumentVault projectId={data.project.id} initialDocuments={documents} />
}
