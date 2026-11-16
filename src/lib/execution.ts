/**
 * Shared types and pure helpers for projects, milestones and tasks.
 */
import { z } from "zod"

import type { MilestoneRow, TaskPriority, TaskRow, TaskStatus } from "@/src/lib/database.v2.types"

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done"]
export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"]

export const MAX_TASKS_PER_PROJECT = 500
export const MAX_MILESTONES_PER_PROJECT = 60

export type ExecutionTask = Pick<
  TaskRow,
  | "id"
  | "project_id"
  | "milestone_id"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "tag"
  | "assignee_id"
  | "due_date"
  | "blocked_reason"
  | "position"
  | "source"
  | "completed_at"
  | "created_at"
  | "updated_at"
>

export type ExecutionMilestone = Pick<
  MilestoneRow,
  "id" | "project_id" | "title" | "description" | "due_date" | "status" | "position"
>

export const TASK_COLUMNS =
  "id, project_id, milestone_id, title, description, status, priority, tag, assignee_id, due_date, blocked_reason, position, source, completed_at, created_at, updated_at"

export const MILESTONE_COLUMNS = "id, project_id, title, description, due_date, status, position"

/** Today as YYYY-MM-DD (UTC) — due dates are calendar dates without a timezone. */
export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isOverdue(task: { status: TaskStatus; due_date: string | null }, today = todayIso()): boolean {
  return task.status !== "done" && Boolean(task.due_date) && (task.due_date as string) < today
}

export interface ExecutionHealth {
  total: number
  done: number
  inProgress: number
  blocked: number
  overdue: number
  dueThisWeek: number
  unassigned: number
  /** Open tasks not touched for 14 days or more. */
  stale: number
  completionPct: number | null
  overdueMilestones: number
}

const DAY = 24 * 60 * 60 * 1000

/** Facts about delivery, computed from the task list — used by the dashboard and the delay monitor. */
export function executionHealth(
  tasks: Array<Pick<ExecutionTask, "status" | "due_date" | "assignee_id" | "updated_at">>,
  milestones: Array<Pick<ExecutionMilestone, "status" | "due_date">> = [],
  now = new Date(),
): ExecutionHealth {
  const today = todayIso(now)
  const weekAhead = todayIso(new Date(now.getTime() + 7 * DAY))
  const staleBefore = now.getTime() - 14 * DAY
  const open = tasks.filter((task) => task.status !== "done")
  const done = tasks.length - open.length

  return {
    total: tasks.length,
    done,
    inProgress: open.filter((task) => task.status === "in_progress").length,
    blocked: open.filter((task) => task.status === "blocked").length,
    overdue: open.filter((task) => isOverdue(task, today)).length,
    dueThisWeek: open.filter((task) => task.due_date && task.due_date >= today && task.due_date <= weekAhead).length,
    unassigned: open.filter((task) => !task.assignee_id).length,
    stale: open.filter((task) => new Date(task.updated_at).getTime() < staleBefore).length,
    completionPct: tasks.length ? Math.round((done / tasks.length) * 100) : null,
    overdueMilestones: milestones.filter(
      (m) => (m.status === "planned" || m.status === "in_progress") && m.due_date && m.due_date < today,
    ).length,
  }
}

/** Position for a task dropped at `index` among `siblings` (already ordered, excluding the task itself). */
export function positionAt(siblings: Array<{ position: number }>, index: number): number {
  const before = siblings[index - 1]?.position
  const after = siblings[index]?.position
  if (before === undefined && after === undefined) return 1000
  if (before === undefined) return (after as number) - 1000
  if (after === undefined) return before + 1000
  return (before + after) / 2
}

// --- AI planning --------------------------------------------------------------

const text = (max: number) => z.string().trim().min(1).max(max)

export const executionPlanSchema = z.object({
  summary: text(600),
  milestones: z
    .array(
      z.object({
        title: text(160),
        description: z.string().trim().max(600).default(""),
        /** Days from today by which the milestone should be reached. */
        dueInDays: z.coerce.number().int().min(1).max(730),
        tasks: z
          .array(
            z.object({
              title: text(180),
              description: z.string().trim().max(500).default(""),
              priority: z.preprocess(
                (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
                z.enum(["low", "medium", "high", "urgent"]).catch("medium"),
              ),
              dueInDays: z.coerce.number().int().min(1).max(730),
            }),
          )
          .min(1)
          .max(8),
      }),
    )
    .min(2)
    .max(10),
})

export type ExecutionPlan = z.infer<typeof executionPlanSchema>

export const EXECUTION_PLAN_SHAPE = `{
  "summary": "one or two sentences on the approach",
  "milestones": [
    {
      "title": "milestone name",
      "description": "what is true when this milestone is reached",
      "dueInDays": 14,
      "tasks": [
        { "title": "a concrete action one person can complete", "description": "how, or what done looks like", "priority": "low" | "medium" | "high" | "urgent", "dueInDays": 7 }
      ]
    }
  ]
}
Milestones are in chronological order. Every task's dueInDays is on or before its milestone's dueInDays.`

export function addDays(days: number, now = new Date()): string {
  return todayIso(new Date(now.getTime() + days * DAY))
}
