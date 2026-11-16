"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getProjects } from "@/src/features/business/services/project.service"
import { readActiveProjectCookie, resolveActiveProject, writeActiveProjectCookie } from "@/src/lib/active-project"
import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { runAiStructured } from "@/src/lib/ai/service"
import type { ActivityRow, TaskCommentRow, TaskRow } from "@/src/lib/database.v2.types"
import {
  EXECUTION_PLAN_SHAPE,
  MAX_MILESTONES_PER_PROJECT,
  MAX_TASKS_PER_PROJECT,
  MILESTONE_COLUMNS,
  TASK_COLUMNS,
  addDays,
  executionPlanSchema,
  isValidDate,
  type ExecutionMilestone,
  type ExecutionPlan,
  type ExecutionTask,
} from "@/src/lib/execution"
import { cleanText, isUuid } from "@/src/lib/validation"
import { fail, requireWorkspace, type ActionResult, type Workspace } from "@/src/lib/workspace"
import { logActivity } from "@/src/lib/workspace/activity"

const PATH = "/dashboard/projects"

export interface ExecutionMember {
  userId: string
  name: string
  avatarUrl: string | null
}

export interface ExecutionData {
  projects: Array<{ id: string; title: string; description: string | null }>
  activeProjectId: string | null
  milestones: ExecutionMilestone[]
  tasks: ExecutionTask[]
  members: ExecutionMember[]
  currentUserId: string
}

export interface TaskComment {
  id: string
  authorId: string | null
  body: string
  createdAt: string
}

function refresh() {
  revalidatePath(PATH)
  revalidatePath("/dashboard")
}

async function loadMembers(ws: Workspace): Promise<ExecutionMember[]> {
  const { data } = await ws.supabase.rpc("get_startup_team", { target_startup_id: ws.startup.id })
  const members = (data ?? []).map((member) => ({
    userId: member.user_id,
    name: member.full_name?.trim() || member.email.split("@")[0] || "Team member",
    avatarUrl: member.avatar_url,
  }))
  if (!members.some((member) => member.userId === ws.user.id)) {
    const metaName = ws.user.user_metadata?.full_name
    members.unshift({
      userId: ws.user.id,
      name: (typeof metaName === "string" && metaName.trim()) || ws.user.email?.split("@")[0] || "You",
      avatarUrl: null,
    })
  }
  return members
}

/** A project of the active business, or null. */
async function ownProject(ws: Workspace, projectId: string) {
  if (!isUuid(projectId)) return null
  const { data } = await ws.supabase
    .from("projects")
    .select("id, title, description")
    .eq("id", projectId)
    .eq("startup_id", ws.startup.id)
    .maybeSingle()
  return data
}

export async function getExecutionData(projectId?: string): Promise<ExecutionData | null> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return null

  const projects = await getProjects(ws.startup.id)
  const members = await loadMembers(ws)
  if (!projects.length) {
    return { projects: [], activeProjectId: null, milestones: [], tasks: [], members, currentUserId: ws.user.id }
  }

  const preferred = projectId && isUuid(projectId) ? projectId : await readActiveProjectCookie()
  const active = resolveActiveProject(projects, preferred)

  const [{ data: milestones }, { data: tasks }] = await Promise.all([
    ws.supabase.from("milestones").select(MILESTONE_COLUMNS).eq("project_id", active.id).order("position").limit(MAX_MILESTONES_PER_PROJECT),
    ws.supabase.from("tasks").select(TASK_COLUMNS).eq("project_id", active.id).order("position").limit(MAX_TASKS_PER_PROJECT),
  ])

  return {
    projects: projects.map((p) => ({ id: p.id, title: p.title, description: p.description })),
    activeProjectId: active.id,
    milestones: (milestones ?? []) as ExecutionMilestone[],
    tasks: (tasks ?? []) as ExecutionTask[],
    members,
    currentUserId: ws.user.id,
  }
}

// --- Projects -----------------------------------------------------------------

export async function createExecutionProject(input: {
  title: string
  description?: string
}): Promise<ActionResult<{ projectId: string }>> {
  const title = cleanText(input?.title, 160)
  if (title.length < 2) return fail("Give the project a name.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const { data, error } = await ws.supabase
    .from("projects")
    .insert({
      startup_id: ws.startup.id,
      created_by: ws.user.id,
      title,
      description: cleanText(input.description, 2000) || null,
      target_audience: null,
      status: "active",
    })
    .select("id")
    .maybeSingle()
  if (error || !data) return fail("Could not create the project. Please try again.")

  try {
    await writeActiveProjectCookie(data.id)
  } catch {
    // The new project is still returned and opened by the client.
  }
  await logActivity(ws, { action: "project.created", entityType: "project", entityId: data.id, summary: `Created project "${title}"` })
  refresh()
  return { success: true, projectId: data.id }
}

export async function selectExecutionProject(projectId: string): Promise<ActionResult> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return fail(ws.error)
  if (!(await ownProject(ws, projectId))) return fail("That project is not available.")
  await writeActiveProjectCookie(projectId)
  refresh()
  return { success: true }
}

// --- Tasks --------------------------------------------------------------------

const taskPatchSchema = z
  .object({
    title: z.string().trim().min(1, "Give the task a title.").max(200),
    description: z.string().trim().max(4000),
    status: z.enum(["todo", "in_progress", "blocked", "done"]),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    tag: z.string().trim().max(30).nullable(),
    assigneeId: z.string().nullable(),
    milestoneId: z.string().nullable(),
    dueDate: z.string().nullable(),
    blockedReason: z.string().trim().max(500).nullable(),
    position: z.number().finite(),
  })
  .partial()

export type TaskPatch = z.input<typeof taskPatchSchema>

type TaskColumns = Partial<
  Pick<
    TaskRow,
    "title" | "description" | "status" | "priority" | "tag" | "position" | "blocked_reason" | "assignee_id" | "milestone_id" | "due_date"
  >
>

function toTaskColumns(patch: z.infer<typeof taskPatchSchema>): TaskColumns | { error: string } {
  const row: TaskColumns = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.status !== undefined) row.status = patch.status
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.tag !== undefined) row.tag = patch.tag || null
  if (patch.position !== undefined) row.position = patch.position
  if (patch.blockedReason !== undefined) row.blocked_reason = patch.blockedReason || null
  if (patch.assigneeId !== undefined) {
    if (patch.assigneeId && !isUuid(patch.assigneeId)) return { error: "Choose someone on this team." }
    row.assignee_id = patch.assigneeId || null
  }
  if (patch.milestoneId !== undefined) {
    if (patch.milestoneId && !isUuid(patch.milestoneId)) return { error: "That milestone is not available." }
    row.milestone_id = patch.milestoneId || null
  }
  if (patch.dueDate !== undefined) {
    if (patch.dueDate && !isValidDate(patch.dueDate)) return { error: "Choose a valid due date." }
    row.due_date = patch.dueDate || null
  }
  return row
}

/** Database triggers reject cross-workspace links and non-team assignees; turn those into clear messages. */
function taskError(message: string | undefined): string {
  if (message?.includes("task_assignee_not_on_team")) return "You can only assign tasks to people on this team."
  if (message?.includes("task_milestone_mismatch")) return "That milestone belongs to another project."
  return "Could not save the task. Please try again."
}

export async function createTask(
  projectId: string,
  input: TaskPatch & { title: string },
): Promise<ActionResult<{ task: ExecutionTask }>> {
  const parsed = taskPatchSchema.safeParse(input)
  if (!parsed.success || !parsed.data.title) return fail(parsed.success ? "Give the task a title." : parsed.error.issues[0].message)
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const project = await ownProject(ws, projectId)
  if (!project) return fail("That project is not available.")

  const columns = toTaskColumns(parsed.data)
  if ("error" in columns) return fail(columns.error)

  const { data: last } = await ws.supabase
    .from("tasks")
    .select("position", { count: "exact" })
    .eq("project_id", project.id)
    .order("position", { ascending: false })
    .limit(1)
  const { count } = await ws.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", project.id)
  if ((count ?? 0) >= MAX_TASKS_PER_PROJECT) return fail("This project has reached its task limit. Archive or delete finished tasks.")

  const { data, error } = await ws.supabase
    .from("tasks")
    .insert({
      ...columns,
      title: parsed.data.title,
      startup_id: ws.startup.id,
      project_id: project.id,
      created_by: ws.user.id,
      position: parsed.data.position ?? (last?.[0]?.position ?? 0) + 1000,
    })
    .select(TASK_COLUMNS)
    .maybeSingle()
  if (error || !data) return fail(taskError(error?.message))

  await logActivity(ws, { action: "task.created", entityType: "task", entityId: data.id, summary: `Added task "${data.title}"` })
  refresh()
  return { success: true, task: data as ExecutionTask }
}

export async function updateTask(taskId: string, patch: TaskPatch): Promise<ActionResult<{ task: ExecutionTask }>> {
  const parsed = taskPatchSchema.safeParse(patch)
  if (!isUuid(taskId) || !parsed.success) return fail(parsed.success ? "That task is not available." : parsed.error.issues[0].message)
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const columns = toTaskColumns(parsed.data)
  if ("error" in columns) return fail(columns.error)
  if (!Object.keys(columns).length) return fail("Nothing to change.")

  const { data, error } = await ws.supabase
    .from("tasks")
    .update(columns)
    .eq("id", taskId)
    .eq("startup_id", ws.startup.id)
    .select(TASK_COLUMNS)
    .maybeSingle()
  if (error || !data) return fail(taskError(error?.message))

  if (parsed.data.status) {
    await logActivity(ws, {
      action: `task.${parsed.data.status}`,
      entityType: "task",
      entityId: data.id,
      summary: `${parsed.data.status === "done" ? "Completed" : parsed.data.status === "blocked" ? "Blocked" : "Moved"} task "${data.title}"`,
    })
  }
  refresh()
  return { success: true, task: data as ExecutionTask }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  if (!isUuid(taskId)) return fail("That task is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const { error, count } = await ws.supabase.from("tasks").delete({ count: "exact" }).eq("id", taskId).eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not delete the task.")
  refresh()
  return { success: true }
}

// --- Milestones ---------------------------------------------------------------

const milestoneSchema = z.object({
  title: z.string().trim().min(2, "Give the milestone a name.").max(200),
  description: z.string().trim().max(2000).default(""),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["planned", "in_progress", "done", "cancelled"]).default("planned"),
})

export type MilestoneInput = z.input<typeof milestoneSchema>

export async function saveMilestone(
  projectId: string,
  input: MilestoneInput,
  milestoneId?: string,
): Promise<ActionResult<{ milestone: ExecutionMilestone }>> {
  const parsed = milestoneSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details and try again.")
  if (parsed.data.dueDate && !isValidDate(parsed.data.dueDate)) return fail("Choose a valid date.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const row = {
    title: parsed.data.title,
    description: parsed.data.description,
    due_date: parsed.data.dueDate || null,
    status: parsed.data.status,
  }

  if (milestoneId) {
    if (!isUuid(milestoneId)) return fail("That milestone is not available.")
    const { data, error } = await ws.supabase
      .from("milestones")
      .update(row)
      .eq("id", milestoneId)
      .eq("startup_id", ws.startup.id)
      .select(MILESTONE_COLUMNS)
      .maybeSingle()
    if (error || !data) return fail("Could not save the milestone. Please try again.")
    refresh()
    return { success: true, milestone: data as ExecutionMilestone }
  }

  const project = await ownProject(ws, projectId)
  if (!project) return fail("That project is not available.")
  const { count } = await ws.supabase.from("milestones").select("id", { count: "exact", head: true }).eq("project_id", project.id)
  if ((count ?? 0) >= MAX_MILESTONES_PER_PROJECT) return fail("This project has reached its milestone limit.")

  const { data, error } = await ws.supabase
    .from("milestones")
    .insert({ ...row, startup_id: ws.startup.id, project_id: project.id, created_by: ws.user.id, position: (count ?? 0) + 1 })
    .select(MILESTONE_COLUMNS)
    .maybeSingle()
  if (error || !data) return fail("Could not save the milestone. Please try again.")
  await logActivity(ws, { action: "milestone.created", entityType: "milestone", entityId: data.id, summary: `Added milestone "${data.title}"` })
  refresh()
  return { success: true, milestone: data as ExecutionMilestone }
}

export async function deleteMilestone(milestoneId: string): Promise<ActionResult> {
  if (!isUuid(milestoneId)) return fail("That milestone is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const { error, count } = await ws.supabase
    .from("milestones")
    .delete({ count: "exact" })
    .eq("id", milestoneId)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not delete the milestone.")
  refresh()
  return { success: true }
}

// --- Comments -----------------------------------------------------------------

const toComment = (row: Pick<TaskCommentRow, "id" | "author_id" | "body" | "created_at">): TaskComment => ({
  id: row.id,
  authorId: row.author_id,
  body: row.body,
  createdAt: row.created_at,
})

export async function listTaskComments(taskId: string): Promise<TaskComment[]> {
  if (!isUuid(taskId)) return []
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []
  const { data } = await ws.supabase
    .from("task_comments")
    .select("id, author_id, body, created_at")
    .eq("task_id", taskId)
    .eq("startup_id", ws.startup.id)
    .order("created_at")
    .limit(200)
  return (data ?? []).map(toComment)
}

export async function addTaskComment(taskId: string, body: string): Promise<ActionResult<{ comment: TaskComment }>> {
  const text = cleanText(body, 2000)
  if (!isUuid(taskId) || !text) return fail("Write a comment first.")
  const ws = await requireWorkspace("comment")
  if ("error" in ws) return fail(ws.error)
  const { data, error } = await ws.supabase
    .from("task_comments")
    .insert({ task_id: taskId, startup_id: ws.startup.id, author_id: ws.user.id, body: text })
    .select("id, author_id, body, created_at")
    .maybeSingle()
  if (error || !data) return fail("Could not post the comment. Please try again.")
  await logActivity(ws, { action: "task.commented", entityType: "task", entityId: taskId, summary: "Commented on a task" })
  return { success: true, comment: toComment(data) }
}

export async function deleteTaskComment(commentId: string): Promise<ActionResult> {
  if (!isUuid(commentId)) return fail("That comment is not available.")
  const ws = await requireWorkspace("comment")
  if ("error" in ws) return fail(ws.error)
  const { error, count } = await ws.supabase
    .from("task_comments")
    .delete({ count: "exact" })
    .eq("id", commentId)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not delete the comment.")
  return { success: true }
}

// --- AI: objective -> milestones and tasks ------------------------------------

/** Proposes a plan for an objective. Nothing is created until the founder applies it. */
export async function proposeExecutionPlan(input: {
  objective: string
  deadlineDays: number
}): Promise<ActionResult<{ plan: ExecutionPlan }>> {
  const objective = cleanText(input?.objective, 600)
  const deadlineDays = Math.round(Number(input?.deadlineDays))
  if (objective.length < 8) return fail("Describe the objective in a sentence.")
  if (!Number.isFinite(deadlineDays) || deadlineDays < 7 || deadlineDays > 730) return fail("Choose a deadline between 1 week and 2 years.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const context = await buildBusinessContext(ws, ["model", "validation", "execution"])
  const result = await runAiStructured({
    feature: "execution.plan",
    caller: ws.caller,
    gate: "projects",
    system: baseSystemPrompt({
      role: "a product and project manager for early-stage businesses",
      locale: ws.locale,
      extra: `Break the founder's objective into an execution plan to complete within ${deadlineDays} days.
- 4 to 8 milestones in logical order (for example: validation, requirements, design, build, test, launch, first customers — adapted to this objective and business).
- 2 to 6 concrete tasks per milestone, each small enough for one person to finish in a few days, starting with a verb.
- Be realistic for a small team with limited capital in this country. Include validation with real customers before large spending.
- Do not duplicate tasks that are already open in the workspace.
- No dueInDays may exceed ${deadlineDays}.`,
    }),
    messages: [{ role: "user", content: `${context}\n\nObjective:\n${fence("founder_input", objective, 600)}` }],
    schema: executionPlanSchema,
    shape: EXECUTION_PLAN_SHAPE,
    maxTokens: 3200,
    temperature: 0.5,
  })
  if (!result.ok) return fail(result.error)

  // Clamp dates so the plan always fits the deadline and tasks never outlast their milestone.
  const plan: ExecutionPlan = {
    summary: result.data.summary,
    milestones: result.data.milestones.map((milestone) => {
      const due = Math.min(milestone.dueInDays, deadlineDays)
      return {
        ...milestone,
        dueInDays: due,
        tasks: milestone.tasks.map((task) => ({ ...task, dueInDays: Math.min(task.dueInDays, due) })),
      }
    }),
  }
  return { success: true, plan }
}

/** Creates the milestones and tasks of a (possibly edited) proposed plan. */
export async function applyExecutionPlan(
  projectId: string,
  plan: unknown,
): Promise<ActionResult<{ milestones: number; tasks: number }>> {
  const parsed = executionPlanSchema.safeParse(plan)
  if (!parsed.success) return fail("This plan could not be read. Generate it again.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const project = await ownProject(ws, projectId)
  if (!project) return fail("That project is not available.")

  const [{ count: milestoneCount }, { count: taskCount }, { data: last }] = await Promise.all([
    ws.supabase.from("milestones").select("id", { count: "exact", head: true }).eq("project_id", project.id),
    ws.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", project.id),
    ws.supabase.from("tasks").select("position").eq("project_id", project.id).order("position", { ascending: false }).limit(1),
  ])
  const newTasks = parsed.data.milestones.reduce((sum, m) => sum + m.tasks.length, 0)
  if ((milestoneCount ?? 0) + parsed.data.milestones.length > MAX_MILESTONES_PER_PROJECT || (taskCount ?? 0) + newTasks > MAX_TASKS_PER_PROJECT) {
    return fail("This plan would exceed the project's limits. Remove some items or finish existing work first.")
  }

  let position = last?.[0]?.position ?? 0
  let createdMilestones = 0
  let createdTasks = 0

  for (const [index, milestone] of parsed.data.milestones.entries()) {
    const { data: row, error } = await ws.supabase
      .from("milestones")
      .insert({
        startup_id: ws.startup.id,
        project_id: project.id,
        title: milestone.title,
        description: milestone.description,
        due_date: addDays(milestone.dueInDays),
        position: (milestoneCount ?? 0) + index + 1,
        created_by: ws.user.id,
      })
      .select("id")
      .maybeSingle()
    if (error || !row) return fail("The plan was only partly created. Check the board and try again for the rest.")
    createdMilestones += 1

    const { error: taskError, count } = await ws.supabase.from("tasks").insert(
      milestone.tasks.map((task) => ({
        startup_id: ws.startup.id,
        project_id: project.id,
        milestone_id: row.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: addDays(task.dueInDays),
        source: "ai" as const,
        position: (position += 1000),
        created_by: ws.user.id,
      })),
      { count: "exact" },
    )
    if (taskError) return fail("The plan was only partly created. Check the board and try again for the rest.")
    createdTasks += count ?? milestone.tasks.length
  }

  await logActivity(ws, {
    action: "plan.applied",
    entityType: "project",
    entityId: project.id,
    summary: `Added ${createdMilestones} milestones and ${createdTasks} tasks from an AI plan`,
  })
  refresh()
  return { success: true, milestones: createdMilestones, tasks: createdTasks }
}

// --- Activity -----------------------------------------------------------------

export async function getRecentActivity(
  limit = 20,
): Promise<Array<Pick<ActivityRow, "id" | "actor_id" | "action" | "summary" | "created_at">>> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []
  const { data } = await ws.supabase
    .from("activity_log")
    .select("id, actor_id, action, summary, created_at")
    .eq("startup_id", ws.startup.id)
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)))
  return data ?? []
}
