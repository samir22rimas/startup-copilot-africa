"use server"

import { revalidatePath } from "next/cache"

import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { webSearchConfigured } from "@/src/lib/ai/providers"
import { runAiStructured } from "@/src/lib/ai/service"
import type { ArtifactRow } from "@/src/lib/database.v2.types"
import { planHasFeature } from "@/src/lib/plans"
import { REPORT_MODULE_GATE, getReportDefinition, type ReportModule } from "@/src/lib/reports/catalog"
import { REPORT_SHAPE, parseReport, readReportMeta, reportSchema, type Report, type ReportMeta } from "@/src/lib/reports/schema"
import { cleanText } from "@/src/lib/validation"
import { fail, requireWorkspace, type ActionResult } from "@/src/lib/workspace"
import { logActivity } from "@/src/lib/workspace/activity"
import { deleteArtifact, getArtifact, listArtifacts, saveArtifact } from "@/src/lib/workspace/artifacts"

export interface SavedReport {
  id: string
  module: ReportModule
  kind: string
  title: string
  report: Report
  meta: ReportMeta
  updatedAt: string
}

export interface ReportListItem {
  id: string
  kind: string
  title: string
  grounded: boolean
  updatedAt: string
}

const MODULE_PATH: Record<ReportModule, string> = {
  validation: "/dashboard/validation",
  research: "/dashboard/research",
  marketing: "/dashboard/marketing",
}

function toSavedReport(row: ArtifactRow): SavedReport | null {
  const report = parseReport(row.content)
  if (!report) return null
  return {
    id: row.id,
    module: row.module as ReportModule,
    kind: row.kind,
    title: row.title,
    report,
    meta: readReportMeta(row.meta),
    updatedAt: row.updated_at,
  }
}

export async function listReports(module: ReportModule): Promise<ReportListItem[]> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []
  const rows = await listArtifacts(ws, module, { limit: 100 })
  return rows
    .filter((row) => getReportDefinition(module, row.kind))
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      grounded: readReportMeta(row.meta).grounded,
      updatedAt: row.updated_at,
    }))
}

export async function getReport(id: string): Promise<SavedReport | null> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return null
  const row = await getArtifact(ws, id)
  return row ? toSavedReport(row) : null
}

/**
 * Generates one analysis and saves it to the workspace.
 * `focus` is an optional question or angle from the founder.
 */
export async function generateReport(input: {
  module: ReportModule
  kind: string
  focus?: string
}): Promise<ActionResult<{ report: SavedReport }>> {
  const definition = getReportDefinition(input?.module, input?.kind)
  if (!definition) return fail("That analysis is not available.")

  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const focus = cleanText(input.focus, 600)
  const useWeb = definition.web && planHasFeature(ws.tier, "web_research") && webSearchConfigured()
  const context = await buildBusinessContext(ws, definition.context)

  const system = baseSystemPrompt({
    role: definition.role,
    locale: ws.locale,
    extra: [
      `Task: ${definition.instructions}`,
      useWeb
        ? `You can search the web. Use it to find current, reliable information (official statistics, regulators, development institutions, reputable press and industry reports). Mark a finding "verified" only when it is supported by a source you retrieved or by the business data; include the year of any figure.`
        : `You have NO access to the web or to live data in this task. You must not mark any market fact, figure or competitor detail as "verified" — only information present in the business data may be "verified". Everything else is an "estimate" (with its assumptions) or an "assumption". In "limitations", state plainly that this analysis was produced without external sources and what the founder should check.`,
      `Be specific to this business, its city and its country. Use the local currency for amounts.`,
    ].join("\n\n"),
  })

  const result = await runAiStructured({
    feature: `report.${definition.module}.${definition.kind}`,
    caller: ws.caller,
    gate: REPORT_MODULE_GATE[definition.module],
    system,
    messages: [
      {
        role: "user",
        content: [context, focus ? `The founder's specific question or focus:\n${fence("founder_input", focus, 600)}` : null, "Produce the analysis now."]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    schema: reportSchema,
    shape: REPORT_SHAPE,
    maxTokens: 3600,
    temperature: 0.4,
    webSearch: useWeb,
  })
  if (!result.ok) return fail(result.error)

  // Without retrieved sources nothing external can be "verified": enforce the
  // rule in code rather than trusting the model to follow it.
  const report: Report = result.grounded
    ? result.data
    : {
        ...result.data,
        sections: result.data.sections.map((section) => ({
          ...section,
          findings: section.findings.map((finding) =>
            finding.basis === "verified" && definition.module === "research"
              ? { ...finding, basis: "assumption" as const }
              : finding,
          ),
        })),
      }

  const meta: ReportMeta = {
    grounded: result.grounded,
    sources: result.grounded ? result.sources.slice(0, 20) : [],
    generatedAt: new Date().toISOString(),
    model: result.model,
    locale: ws.locale,
    ...(focus ? { focus } : {}),
  }

  const saved = await saveArtifact(ws, {
    module: definition.module,
    kind: definition.kind,
    title: report.title,
    content: report,
    meta: meta as unknown as Record<string, unknown>,
  })
  if ("error" in saved) return fail(saved.error)

  await logActivity(ws, {
    action: "report.generated",
    entityType: "artifact",
    entityId: saved.artifact.id,
    summary: `Generated "${report.title}"`,
  })
  revalidatePath(MODULE_PATH[definition.module])

  const out = toSavedReport(saved.artifact)
  return out ? { success: true, report: out } : fail("The report was saved but could not be displayed. Reload the page.")
}

export async function deleteReport(id: string): Promise<ActionResult> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const row = await getArtifact(ws, id)
  if (!row) return fail("This report is no longer available.")
  if (!(await deleteArtifact(ws, id))) return fail("Could not delete the report. Please try again.")
  revalidatePath(MODULE_PATH[row.module as ReportModule] ?? "/dashboard")
  return { success: true }
}
