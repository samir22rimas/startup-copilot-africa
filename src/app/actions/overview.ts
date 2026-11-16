"use server"

import { CANVAS_BLOCKS, canvasCompletion, isCanvasKind, readCanvasContent } from "@/src/lib/canvas"
import { readMarketingWorkspace, readMetadata } from "@/src/lib/data-truth"
import type { ActivityRow } from "@/src/lib/database.v2.types"
import { isOverdue, todayIso, type ExecutionMilestone, type ExecutionTask } from "@/src/lib/execution"
import { modelHasData, parseFinancialModel, summarizeModel } from "@/src/lib/finance/model"
import {
  computeBusinessHealth,
  recommendActions,
  type BusinessHealth,
  type HealthInputs,
  type Recommendation,
} from "@/src/lib/health/score"
import { PLAN_SECTIONS, readPlanSections } from "@/src/lib/plan"
import { requireWorkspace, type Workspace } from "@/src/lib/workspace"

export interface OverviewRisk {
  kind: "overdue" | "blocked" | "invalidated" | "funding" | "noBreakEven" | "recorded"
  /** Free text for recorded risks and task titles; empty for computed ones. */
  text: string
  count: number
}

export interface OverviewData {
  health: BusinessHealth
  recommendations: Recommendation[]
  tasks: Array<Pick<ExecutionTask, "id" | "title" | "status" | "priority" | "due_date" | "assignee_id">>
  openTaskCount: number
  milestones: Array<Pick<ExecutionMilestone, "id" | "title" | "due_date" | "status">>
  risks: OverviewRisk[]
  activity: Array<Pick<ActivityRow, "id" | "summary" | "created_at" | "actor_id">>
  members: Record<string, string>
  finance: { currency: string; fundingRequired: number; breakEvenMonth: number | null; runwayMonths: number | null; horizonMonths: number } | null
}

/**
 * Tasks created by the pre-2.0 dashboard live in projects.metadata. The
 * migration copies the ones that existed when it ran; this copies any written
 * afterwards, once, the first time a project is opened with no tasks.
 */
async function importLegacyTasks(ws: Workspace): Promise<void> {
  const { data: projects } = await ws.supabase.from("projects").select("id, metadata, created_by").eq("startup_id", ws.startup.id)
  for (const project of projects ?? []) {
    const legacy = readMetadata(project.metadata).tasks
    if (!Array.isArray(legacy) || !legacy.length) continue
    const { count } = await ws.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", project.id)
    if (count !== 0) continue

    const rows = legacy
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .filter((item) => typeof item.title === "string" && item.title.trim() && item.id !== "placeholder_1" && item.id !== "rate_limited")
      .slice(0, 100)
      .map((item, index) => ({
        startup_id: ws.startup.id,
        project_id: project.id,
        title: String(item.title).trim().slice(0, 200),
        tag: typeof item.tag === "string" ? item.tag.slice(0, 30) : null,
        status: item.done === true ? ("done" as const) : ("todo" as const),
        source: "legacy" as const,
        position: (index + 1) * 1000,
        created_by: ws.user.id,
      }))
    if (rows.length) await ws.supabase.from("tasks").insert(rows)
  }
}

export async function getOverview(): Promise<OverviewData | null> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return null

  if (ws.role === "owner" || ws.role === "admin" || ws.role === "member") {
    try {
      await importLegacyTasks(ws)
    } catch (error) {
      console.warn("[overview] legacy task import skipped:", error instanceof Error ? error.message : error)
    }
  }

  const sid = ws.startup.id
  const today = todayIso()

  const [assumptions, evidence, artifacts, tasks, milestones, memory, activity, projects, team] = await Promise.all([
    ws.supabase.from("validation_assumptions").select("status").eq("startup_id", sid).limit(500),
    ws.supabase.from("validation_evidence").select("id", { count: "exact", head: true }).eq("startup_id", sid),
    ws.supabase.from("artifacts").select("module, kind, content, updated_at").eq("startup_id", sid).is("archived_at", null).order("updated_at", { ascending: false }).limit(300),
    ws.supabase.from("tasks").select("id, title, status, priority, due_date, assignee_id, updated_at").eq("startup_id", sid).limit(2000),
    ws.supabase.from("milestones").select("id, title, due_date, status").eq("startup_id", sid).limit(300),
    ws.supabase.from("business_memory").select("content").eq("startup_id", sid).eq("kind", "risk").is("archived_at", null).order("created_at", { ascending: false }).limit(3),
    ws.supabase.from("activity_log").select("id, summary, created_at, actor_id").eq("startup_id", sid).order("created_at", { ascending: false }).limit(8),
    ws.supabase.from("projects").select("metadata").eq("startup_id", sid),
    ws.supabase.rpc("get_startup_team", { target_startup_id: sid }),
  ])

  const artifactRows = artifacts.data ?? []
  const latest = (module: string, kind: string) => artifactRows.find((row) => row.module === module && row.kind === kind)

  // Planning: the most complete canvas counts.
  let canvasFilled = 0
  let canvasTotal: number = CANVAS_BLOCKS.bmc.length
  for (const kind of ["bmc", "lean"] as const) {
    const row = latest("model", kind)
    if (!row || !isCanvasKind(kind)) continue
    const completion = canvasCompletion(kind, readCanvasContent(kind, row.content))
    if (completion.filled > canvasFilled) {
      canvasFilled = completion.filled
      canvasTotal = completion.total
    }
  }
  const planSections = Object.keys(readPlanSections(latest("plan", "business_plan")?.content)).length

  // Finance: recomputed from the stored inputs, never read from a cached number.
  const financeRow = latest("finance", "financial_model")
  const model = financeRow ? parseFinancialModel(financeRow.content, ws.startup.budget_currency) : null
  const summary = model && modelHasData(model) ? summarizeModel(model) : null

  const marketingRows = artifactRows.filter((row) => row.module === "marketing")
  const scheduledContent = (projects.data ?? []).reduce(
    (sum, project) => sum + readMarketingWorkspace(readMetadata(project.metadata)).events.length,
    0,
  )

  const taskRows = tasks.data ?? []
  const open = taskRows.filter((task) => task.status !== "done")
  const overdue = open.filter((task) => isOverdue(task, today))
  const blocked = open.filter((task) => task.status === "blocked")
  const milestoneRows = milestones.data ?? []
  const activeMilestones = milestoneRows.filter((m) => m.status === "planned" || m.status === "in_progress")
  const overdueMilestones = activeMilestones.filter((m) => m.due_date && m.due_date < today)
  const assumptionRows = assumptions.data ?? []
  const invalidated = assumptionRows.filter((a) => a.status === "invalidated").length

  const inputs: HealthInputs = {
    stage: ws.startup.stage,
    validation: {
      assumptions: assumptionRows.length,
      tested: assumptionRows.filter((a) => a.status === "validated" || a.status === "invalidated").length,
      invalidated,
      evidence: evidence.count ?? 0,
      analyses: artifactRows.filter((row) => row.module === "validation").length,
    },
    planning: { canvasFilled, canvasTotal, planSections, planTotal: PLAN_SECTIONS.length },
    finance: {
      hasModel: Boolean(summary),
      startupCostLines: model?.startupCosts.filter((c) => c.amount > 0).length ?? 0,
      revenueStreams: model?.revenueStreams.filter((s) => s.unitPrice > 0 && s.unitsMonth1 > 0).length ?? 0,
      expenseLines: model?.monthlyExpenses.filter((c) => c.amount > 0).length ?? 0,
      breakEvenMonth: summary?.breakEvenMonth ?? null,
      fundingRequired: summary?.fundingRequired ?? null,
      horizonMonths: summary?.horizonMonths ?? null,
    },
    marketing: {
      analyses: marketingRows.length,
      hasStrategy: marketingRows.some((row) => row.kind === "marketing_strategy" || row.kind === "brand_positioning" || row.kind === "acquisition"),
      scheduledContent,
    },
    execution: {
      total: taskRows.length,
      done: taskRows.length - open.length,
      overdue: overdue.length,
      blocked: blocked.length,
      milestones: activeMilestones.length,
      overdueMilestones: overdueMilestones.length,
    },
  }

  const risks: OverviewRisk[] = []
  if (overdue.length) risks.push({ kind: "overdue", text: overdue[0].title, count: overdue.length })
  if (blocked.length) risks.push({ kind: "blocked", text: blocked[0].title, count: blocked.length })
  if (invalidated) risks.push({ kind: "invalidated", text: "", count: invalidated })
  if (summary && summary.fundingRequired > 0) risks.push({ kind: "funding", text: "", count: 1 })
  if (summary && inputs.finance.revenueStreams > 0 && summary.breakEvenMonth === null) risks.push({ kind: "noBreakEven", text: "", count: summary.horizonMonths })
  for (const item of memory.data ?? []) risks.push({ kind: "recorded", text: item.content, count: 1 })

  const sortedOpen = [...open].sort(
    (a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31") || Number(b.status === "blocked") - Number(a.status === "blocked"),
  )

  const members: Record<string, string> = {}
  for (const member of team.data ?? []) members[member.user_id] = member.full_name?.trim() || member.email.split("@")[0]

  return {
    health: computeBusinessHealth(inputs),
    recommendations: recommendActions(inputs),
    tasks: sortedOpen.slice(0, 7).map(({ id, title, status, priority, due_date, assignee_id }) => ({ id, title, status, priority, due_date, assignee_id })),
    openTaskCount: open.length,
    milestones: [...activeMilestones].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")).slice(0, 5),
    risks: risks.slice(0, 6),
    activity: activity.data ?? [],
    members,
    finance: summary
      ? {
          currency: summary.currency,
          fundingRequired: summary.fundingRequired,
          breakEvenMonth: summary.breakEvenMonth,
          runwayMonths: summary.runwayMonths,
          horizonMonths: summary.horizonMonths,
        }
      : null,
  }
}
