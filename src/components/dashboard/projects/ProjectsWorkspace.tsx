"use client"

import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flag,
  KanbanSquare,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import {
  applyExecutionPlan,
  createExecutionProject,
  createTask,
  deleteMilestone,
  deleteTask,
  proposeExecutionPlan,
  saveMilestone,
  selectExecutionProject,
  updateTask,
  type ExecutionData,
} from "@/src/app/actions/execution"
import { TaskDialog, draftFromTask, draftToPatch, type TaskDraft } from "@/src/components/dashboard/projects/TaskDialog"
import { Modal, Tabs } from "@/src/components/ui/overlay"
import {
  Badge,
  EmptyState,
  Field,
  Notice,
  Panel,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
  type BadgeTone,
} from "@/src/components/ui/page"
import type { MilestoneStatus, TaskPriority, TaskStatus } from "@/src/lib/database.v2.types"
import {
  TASK_STATUSES,
  addDays,
  executionHealth,
  isOverdue,
  positionAt,
  todayIso,
  type ExecutionPlan,
  type ExecutionTask,
} from "@/src/lib/execution"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { cn } from "@/src/lib/utils"

type View = "board" | "list" | "milestones" | "calendar"

const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = { low: "neutral", medium: "blue", high: "amber", urgent: "red" }
const MILESTONE_STATUSES: MilestoneStatus[] = ["planned", "in_progress", "done", "cancelled"]
const MILESTONE_TONE: Record<MilestoneStatus, BadgeTone> = { planned: "neutral", in_progress: "blue", done: "green", cancelled: "neutral" }

type MilestoneDraft = { id?: string; title: string; description: string; dueDate: string; status: MilestoneStatus }

export function ProjectsWorkspace({
  data,
  canEdit,
  canComment,
}: {
  data: ExecutionData
  canEdit: boolean
  canComment: boolean
}) {
  const { t, locale } = useI18n()
  const p = t.projects
  const router = useRouter()
  const projectId = data.activeProjectId

  const [view, setView] = React.useState<View>("board")
  const [tasks, setTasks] = React.useState(data.tasks)
  const [milestones, setMilestones] = React.useState(data.milestones)
  const [filter, setFilter] = React.useState<"all" | "mine" | "overdue">("all")
  const [taskDraft, setTaskDraft] = React.useState<TaskDraft | null>(null)
  const [milestoneDraft, setMilestoneDraft] = React.useState<MilestoneDraft | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [dropTarget, setDropTarget] = React.useState<TaskStatus | null>(null)
  const [projectOpen, setProjectOpen] = React.useState(false)
  const [projectTitle, setProjectTitle] = React.useState("")
  const [planOpen, setPlanOpen] = React.useState(false)
  const [objective, setObjective] = React.useState("")
  const [deadline, setDeadline] = React.useState("90")
  const [planning, setPlanning] = React.useState(false)
  const [plan, setPlan] = React.useState<ExecutionPlan | null>(null)
  const [calendarMonth, setCalendarMonth] = React.useState(() => todayIso().slice(0, 7))

  // Adopt fresh server data after a refresh or a project switch.
  const [synced, setSynced] = React.useState(data)
  if (synced !== data) {
    setSynced(data)
    setTasks(data.tasks)
    setMilestones(data.milestones)
  }

  const today = todayIso()
  const health = executionHealth(tasks, milestones)
  const memberById = React.useMemo(() => new Map(data.members.map((m) => [m.userId, m])), [data.members])
  const milestoneById = React.useMemo(() => new Map(milestones.map((m) => [m.id, m])), [milestones])

  const visible = tasks.filter((task) => {
    if (filter === "mine") return task.assignee_id === data.currentUserId
    if (filter === "overdue") return isOverdue(task, today)
    return true
  })
  const byStatus = (status: TaskStatus) => visible.filter((task) => task.status === status).sort((a, b) => a.position - b.position)
  const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })

  function replaceTask(next: ExecutionTask) {
    setTasks((list) => list.map((task) => (task.id === next.id ? next : task)))
  }

  async function moveTask(taskId: string, status: TaskStatus) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task || task.status === status) return
    const siblings = tasks.filter((item) => item.status === status && item.id !== taskId).sort((a, b) => a.position - b.position)
    const position = positionAt(siblings, siblings.length)
    const previous = tasks
    replaceTask({ ...task, status, position, blocked_reason: status === "blocked" ? task.blocked_reason : null })
    const result = await updateTask(taskId, { status, position })
    if (!result.success) {
      setTasks(previous)
      toast.error(result.error)
    } else {
      replaceTask(result.task)
    }
  }

  async function submitTask() {
    if (!taskDraft || !projectId || saving) return
    setSaving(true)
    const patch = draftToPatch(taskDraft)
    const result = taskDraft.id ? await updateTask(taskDraft.id, patch) : await createTask(projectId, patch)
    setSaving(false)
    if (!result.success) return void toast.error(result.error)
    setTasks((list) => (taskDraft.id ? list.map((task) => (task.id === result.task.id ? result.task : task)) : [...list, result.task]))
    setTaskDraft(null)
  }

  async function removeTask(taskId: string) {
    if (!window.confirm(t.common.confirmDelete)) return
    const result = await deleteTask(taskId)
    if (!result.success) return void toast.error(result.error)
    setTasks((list) => list.filter((task) => task.id !== taskId))
    setTaskDraft(null)
  }

  async function submitMilestone(event: React.FormEvent) {
    event.preventDefault()
    if (!milestoneDraft || !projectId || saving) return
    setSaving(true)
    const { id, ...input } = milestoneDraft
    const result = await saveMilestone(projectId, { ...input, dueDate: input.dueDate || null }, id)
    setSaving(false)
    if (!result.success) return void toast.error(result.error)
    setMilestones((list) => (id ? list.map((m) => (m.id === id ? result.milestone : m)) : [...list, result.milestone]))
    setMilestoneDraft(null)
  }

  async function removeMilestone(id: string) {
    if (!window.confirm(p.deleteMilestoneConfirm)) return
    const result = await deleteMilestone(id)
    if (!result.success) return void toast.error(result.error)
    setMilestones((list) => list.filter((m) => m.id !== id))
    setTasks((list) => list.map((task) => (task.milestone_id === id ? { ...task, milestone_id: null } : task)))
  }

  async function submitProject(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    const result = await createExecutionProject({ title: projectTitle })
    setSaving(false)
    if (!result.success) return void toast.error(result.error)
    setProjectOpen(false)
    setProjectTitle("")
    router.refresh()
  }

  async function switchProject(id: string) {
    const result = await selectExecutionProject(id)
    if (!result.success) return void toast.error(result.error)
    router.refresh()
  }

  async function handlePropose(event: React.FormEvent) {
    event.preventDefault()
    if (planning) return
    setPlanning(true)
    try {
      const result = await proposeExecutionPlan({ objective, deadlineDays: Number(deadline) })
      if (!result.success) return void toast.error(result.error)
      setPlan(result.plan)
    } finally {
      setPlanning(false)
    }
  }

  async function handleApplyPlan() {
    if (!plan || !projectId || planning) return
    setPlanning(true)
    const result = await applyExecutionPlan(projectId, plan)
    setPlanning(false)
    if (!result.success) return void toast.error(result.error)
    toast.success(fmt(p.planApplied, { milestones: result.milestones, tasks: result.tasks }))
    setPlan(null)
    setPlanOpen(false)
    setObjective("")
    router.refresh()
  }

  function renderTaskCard(task: ExecutionTask, draggable: boolean) {
    const overdue = isOverdue(task, today)
    const assignee = task.assignee_id ? memberById.get(task.assignee_id) : null
    const milestone = task.milestone_id ? milestoneById.get(task.milestone_id) : null
    return (
      <div
        key={task.id}
        draggable={draggable}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", task.id)
          event.dataTransfer.effectAllowed = "move"
          setDragging(task.id)
        }}
        onDragEnd={() => {
          setDragging(null)
          setDropTarget(null)
        }}
        className={cn(
          "rounded-lg border border-border bg-card p-3 shadow-xs transition",
          draggable && "cursor-grab active:cursor-grabbing",
          dragging === task.id && "opacity-40",
        )}
      >
        <button type="button" onClick={() => setTaskDraft(draftFromTask(task))} className="block w-full text-left">
          <span className={cn("text-sm font-medium leading-snug text-foreground", task.status === "done" && "text-muted-foreground line-through")}>
            {task.title}
          </span>
        </button>
        {task.status === "blocked" && task.blocked_reason && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{task.blocked_reason}</p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={PRIORITY_TONE[task.priority]}>{p.priorities[task.priority]}</Badge>
          {task.due_date && (
            <Badge tone={overdue ? "red" : "neutral"}>
              <CalendarDays className="size-3" /> {formatDate(task.due_date)}
            </Badge>
          )}
          {milestone && (
            <Badge tone="brand" className="max-w-[9rem] truncate">
              <Flag className="size-3 shrink-0" /> <span className="truncate">{milestone.title}</span>
            </Badge>
          )}
          {assignee && (
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground" title={assignee.name}>
              <UserRound className="size-3" /> {assignee.name.split(" ")[0]}
            </span>
          )}
        </div>
        {canEdit && (
          <label className="mt-2.5 block lg:hidden">
            <span className="sr-only">{p.status}</span>
            <select value={task.status} onChange={(event) => moveTask(task.id, event.target.value as TaskStatus)} className={cn(inputClass, "h-8 text-xs")}>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {p.statuses[status]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    )
  }

  const projectModal = (
      <Modal open={projectOpen} onClose={() => setProjectOpen(false)} title={p.newProject} closeLabel={t.common.close} size="sm">
        <form onSubmit={submitProject} className="space-y-4">
          <Field label={p.projectName} htmlFor="project-name">
            <input id="project-name" required minLength={2} maxLength={160} value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder={p.projectPlaceholder} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => setProjectOpen(false)}>
              {t.common.cancel}
            </button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving && <Loader2 className="size-4 animate-spin" />} {t.common.create}
            </button>
          </div>
        </form>
      </Modal>
  )

  // Calendar grid for the selected month (weeks start on Monday).
  const [calYear, calMonth] = calendarMonth.split("-").map(Number)
  const firstDay = new Date(Date.UTC(calYear, calMonth - 1, 1))
  const daysInMonth = new Date(Date.UTC(calYear, calMonth, 0)).getUTCDate()
  const leading = (firstDay.getUTCDay() + 6) % 7
  const cells: Array<string | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${calendarMonth}-${String(i + 1).padStart(2, "0")}`),
  ]
  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(calYear, calMonth - 1 + delta, 1))
    setCalendarMonth(next.toISOString().slice(0, 7))
  }
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }),
  )

  if (!projectId) {
    return (
      <Panel>
        <EmptyState
          icon={KanbanSquare}
          title={p.noProjectTitle}
          description={p.noProjectBody}
          action={
            canEdit ? (
              <button type="button" className={primaryButtonClass} onClick={() => setProjectOpen(true)}>
                <Plus className="size-4" /> {p.newProject}
              </button>
            ) : null
          }
        />
        {projectModal}
      </Panel>
    )
  }

  const attention = health.overdue + health.blocked + health.overdueMilestones

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="project-switch" className="sr-only">
            {p.project}
          </label>
          <select id="project-switch" value={projectId} onChange={(event) => switchProject(event.target.value)} className={cn(inputClass, "w-auto max-w-xs font-medium")}>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          {canEdit && (
            <button type="button" className={secondaryButtonClass} onClick={() => setProjectOpen(true)}>
              <Plus className="size-4" /> {p.newProject}
            </button>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => setPlanOpen(true)}>
              <Sparkles className="size-4" /> {p.planWithAi}
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => setTaskDraft(draftFromTask(null))}>
              <Plus className="size-4" /> {p.newTask}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            [p.statProgress, health.completionPct === null ? "—" : `${health.completionPct}%`, fmt(p.statProgressHint, { done: health.done, total: health.total })],
            [p.statOverdue, String(health.overdue), p.statOverdueHint],
            [p.statBlocked, String(health.blocked), p.statBlockedHint],
            [p.statDueSoon, String(health.dueThisWeek), p.statDueSoonHint],
          ] as const
        ).map(([label, value, hint], index) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("tabular mt-1 text-xl font-semibold", (index === 1 || index === 2) && value !== "0" ? "text-red-600 dark:text-red-400" : "text-foreground")}>
              {value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      {attention > 0 && (
        <Notice tone="warning" title={p.attentionTitle}>
          {[
            health.overdue ? fmt(p.attentionOverdue, { count: health.overdue }) : null,
            health.blocked ? fmt(p.attentionBlocked, { count: health.blocked }) : null,
            health.overdueMilestones ? fmt(p.attentionMilestones, { count: health.overdueMilestones }) : null,
            health.stale ? fmt(p.attentionStale, { count: health.stale }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Notice>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs<View>
          value={view}
          onChange={setView}
          label={t.pages.projects.title}
          className="border-0"
          items={[
            { id: "board", label: p.viewBoard },
            { id: "list", label: p.viewList },
            { id: "milestones", label: p.viewMilestones, count: milestones.length },
            { id: "calendar", label: p.viewCalendar },
          ]}
        />
        {(view === "board" || view === "list") && (
          <select aria-label={p.filter} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className={cn(inputClass, "h-8 w-auto text-xs")}>
            <option value="all">{p.filterAll}</option>
            <option value="mine">{p.filterMine}</option>
            <option value="overdue">{p.filterOverdue}</option>
          </select>
        )}
      </div>

      {view === "board" && (
        <div className="grid gap-4 lg:grid-cols-4">
          {TASK_STATUSES.map((status) => {
            const column = byStatus(status)
            return (
              <section
                key={status}
                aria-label={p.statuses[status]}
                onDragOver={(event) => {
                  if (!canEdit || !dragging) return
                  event.preventDefault()
                  setDropTarget(status)
                }}
                onDragLeave={() => setDropTarget((current) => (current === status ? null : current))}
                onDrop={(event) => {
                  event.preventDefault()
                  const id = event.dataTransfer.getData("text/plain")
                  setDropTarget(null)
                  setDragging(null)
                  if (id) void moveTask(id, status)
                }}
                className={cn(
                  "flex min-h-32 flex-col rounded-xl bg-muted/50 p-2.5 transition",
                  dropTarget === status && "ring-2 ring-primary/50",
                )}
              >
                <header className="flex items-center justify-between px-1.5 pb-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {p.statuses[status]} <span className="tabular ml-1 font-normal">{column.length}</span>
                  </h3>
                  {canEdit && (
                    <button type="button" aria-label={`${p.newTask}: ${p.statuses[status]}`} onClick={() => setTaskDraft(draftFromTask(null, status))} className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground">
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </header>
                <div className="space-y-2">
                  {column.map((task) => renderTaskCard(task, canEdit))}
                  {column.length === 0 && <p className="px-1.5 py-4 text-center text-xs text-muted-foreground">{p.emptyColumn}</p>}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {view === "list" && (
        <Panel className="overflow-x-auto">
          {visible.length === 0 ? (
            <EmptyState icon={KanbanSquare} title={p.noTasksTitle} description={p.noTasksBody} />
          ) : (
            <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">{p.taskTitle}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{p.status}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{p.priority}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{p.assignee}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{p.dueDate}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{p.milestone}</th>
                </tr>
              </thead>
              <tbody>
                {[...visible]
                  .sort((a, b) => TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
                  .map((task) => (
                    <tr key={task.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => setTaskDraft(draftFromTask(task))} className={cn("text-left font-medium text-foreground hover:underline", task.status === "done" && "text-muted-foreground line-through")}>
                          {task.title}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        {canEdit ? (
                          <select aria-label={p.status} value={task.status} onChange={(event) => moveTask(task.id, event.target.value as TaskStatus)} className={cn(inputClass, "h-8 w-auto text-xs")}>
                            {TASK_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {p.statuses[status]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          p.statuses[task.status]
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={PRIORITY_TONE[task.priority]}>{p.priorities[task.priority]}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{task.assignee_id ? (memberById.get(task.assignee_id)?.name ?? p.formerMember) : t.common.unassigned}</td>
                      <td className={cn("tabular px-4 py-2.5", isOverdue(task, today) ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                        {task.due_date ? formatDate(task.due_date) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{task.milestone_id ? (milestoneById.get(task.milestone_id)?.title ?? "—") : "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {view === "milestones" && (
        <Panel>
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">{p.milestonesHint}</p>
            {canEdit && (
              <button type="button" className={primaryButtonClass} onClick={() => setMilestoneDraft({ title: "", description: "", dueDate: addDays(30), status: "planned" })}>
                <Plus className="size-4" /> {p.newMilestone}
              </button>
            )}
          </div>
          {milestones.length === 0 ? (
            <EmptyState icon={Flag} title={p.noMilestonesTitle} description={p.noMilestonesBody} />
          ) : (
            <ol className="divide-y divide-border">
              {[...milestones]
                .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.position - b.position)
                .map((milestone) => {
                  const own = tasks.filter((task) => task.milestone_id === milestone.id)
                  const done = own.filter((task) => task.status === "done").length
                  const late = (milestone.status === "planned" || milestone.status === "in_progress") && milestone.due_date && milestone.due_date < today
                  return (
                    <li key={milestone.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{milestone.title}</h3>
                            <Badge tone={MILESTONE_TONE[milestone.status]}>{p.milestoneStatuses[milestone.status]}</Badge>
                            {milestone.due_date && (
                              <Badge tone={late ? "red" : "neutral"}>
                                <CalendarDays className="size-3" /> {formatDate(milestone.due_date)}
                                {late ? ` · ${p.late}` : ""}
                              </Badge>
                            )}
                          </div>
                          {milestone.description && <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>}
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              aria-label={t.common.edit}
                              onClick={() => setMilestoneDraft({ id: milestone.id, title: milestone.title, description: milestone.description, dueDate: milestone.due_date ?? "", status: milestone.status })}
                              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button type="button" aria-label={t.common.delete} onClick={() => removeMilestone(milestone.id)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div className="h-full rounded-full bg-primary" style={{ width: own.length ? `${(done / own.length) * 100}%` : "0%" }} />
                        </div>
                        <span className="tabular shrink-0 text-xs text-muted-foreground">{fmt(p.tasksDone, { done, total: own.length })}</span>
                      </div>
                    </li>
                  )
                })}
            </ol>
          )}
        </Panel>
      )}

      {view === "calendar" && (
        <Panel>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold capitalize text-foreground">
              {firstDay.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" })}
            </h3>
            <div className="flex gap-1">
              <button type="button" aria-label={p.previousMonth} onClick={() => shiftMonth(-1)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => setCalendarMonth(today.slice(0, 7))} className={cn(secondaryButtonClass, "h-8 text-xs")}>
                {t.common.today}
              </button>
              <button type="button" aria-label={p.nextMonth} onClick={() => shiftMonth(1)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[42rem] grid-cols-7">
              {weekdays.map((day) => (
                <div key={day} className="border-b border-border px-2 py-1.5 text-center text-[11px] font-medium uppercase text-muted-foreground">
                  {day}
                </div>
              ))}
              {cells.map((date, index) => {
                const dayTasks = date ? tasks.filter((task) => task.due_date === date) : []
                const dayMilestones = date ? milestones.filter((m) => m.due_date === date) : []
                return (
                  <div key={index} className={cn("min-h-24 border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0", !date && "bg-muted/30")}>
                    {date && (
                      <>
                        <span className={cn("tabular inline-flex size-6 items-center justify-center rounded-full text-xs", date === today ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground")}>
                          {Number(date.slice(8))}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayMilestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center gap-1 truncate rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground" title={milestone.title}>
                              <Flag className="size-3 shrink-0" /> <span className="truncate">{milestone.title}</span>
                            </div>
                          ))}
                          {dayTasks.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => setTaskDraft(draftFromTask(task))}
                              title={task.title}
                              className={cn(
                                "block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px]",
                                task.status === "done"
                                  ? "border-transparent bg-muted text-muted-foreground line-through"
                                  : isOverdue(task, today)
                                    ? "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200"
                                    : "border-border bg-card text-foreground",
                              )}
                            >
                              {task.title}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <p className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5" /> {p.calendarHint}
          </p>
        </Panel>
      )}

      <TaskDialog
        draft={taskDraft}
        onChange={setTaskDraft}
        onClose={() => setTaskDraft(null)}
        onSubmit={submitTask}
        onDelete={removeTask}
        saving={saving}
        members={data.members}
        milestones={milestones}
        currentUserId={data.currentUserId}
        canEdit={canEdit}
        canComment={canComment}
      />

      <Modal open={milestoneDraft !== null} onClose={() => setMilestoneDraft(null)} title={milestoneDraft?.id ? p.editMilestone : p.newMilestone} closeLabel={t.common.close} size="md">
        {milestoneDraft && (
          <form onSubmit={submitMilestone} className="space-y-4">
            <Field label={p.milestoneName} htmlFor="milestone-title">
              <input id="milestone-title" required minLength={2} maxLength={200} value={milestoneDraft.title} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, title: e.target.value })} className={inputClass} />
            </Field>
            <Field label={p.description} htmlFor="milestone-description">
              <textarea id="milestone-description" rows={2} maxLength={2000} value={milestoneDraft.description} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, description: e.target.value })} className={textareaClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={p.dueDate} htmlFor="milestone-due">
                <input id="milestone-due" type="date" value={milestoneDraft.dueDate} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, dueDate: e.target.value })} className={inputClass} />
              </Field>
              <Field label={p.status} htmlFor="milestone-status">
                <select id="milestone-status" value={milestoneDraft.status} onChange={(e) => setMilestoneDraft({ ...milestoneDraft, status: e.target.value as MilestoneStatus })} className={inputClass}>
                  {MILESTONE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {p.milestoneStatuses[status]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setMilestoneDraft(null)}>
                {t.common.cancel}
              </button>
              <button type="submit" disabled={saving} className={primaryButtonClass}>
                {saving && <Loader2 className="size-4 animate-spin" />} {t.common.save}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={planOpen}
        onClose={() => {
          if (!planning) {
            setPlanOpen(false)
            setPlan(null)
          }
        }}
        title={p.planTitle}
        description={p.planBody}
        closeLabel={t.common.close}
        size="lg"
      >
        {!plan ? (
          <form onSubmit={handlePropose} className="space-y-4">
            <Field label={p.objective} htmlFor="plan-objective">
              <textarea id="plan-objective" required minLength={8} maxLength={600} rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder={p.objectivePlaceholder} className={textareaClass} />
            </Field>
            <Field label={p.deadline} htmlFor="plan-deadline">
              <select id="plan-deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={cn(inputClass, "w-auto")}>
                {[30, 60, 90, 180, 365].map((days) => (
                  <option key={days} value={days}>
                    {fmt(p.days, { days })}
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" disabled={planning} className={primaryButtonClass}>
              {planning ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {planning ? t.common.generating : p.proposePlan}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground">{plan.summary}</p>
            <ol className="space-y-3">
              {plan.milestones.map((milestone, mIndex) => (
                <li key={mIndex} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{milestone.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(addDays(milestone.dueInDays))}
                        {milestone.description ? ` · ${milestone.description}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`${t.common.remove}: ${milestone.title}`}
                      disabled={plan.milestones.length <= 2}
                      onClick={() => setPlan({ ...plan, milestones: plan.milestones.filter((_, i) => i !== mIndex) })}
                      className="text-muted-foreground hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {milestone.tasks.map((task, tIndex) => (
                      <li key={tIndex} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1">{task.title}</span>
                        <Badge tone={PRIORITY_TONE[task.priority]}>{p.priorities[task.priority]}</Badge>
                        <button
                          type="button"
                          aria-label={`${t.common.remove}: ${task.title}`}
                          disabled={milestone.tasks.length <= 1}
                          onClick={() =>
                            setPlan({
                              ...plan,
                              milestones: plan.milestones.map((m, i) => (i === mIndex ? { ...m, tasks: m.tasks.filter((_, j) => j !== tIndex) } : m)),
                            })
                          }
                          className="text-muted-foreground hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {p.planReviewNote}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={secondaryButtonClass} disabled={planning} onClick={() => setPlan(null)}>
                {t.common.back}
              </button>
              <button type="button" className={primaryButtonClass} disabled={planning} onClick={handleApplyPlan}>
                {planning && <Loader2 className="size-4 animate-spin" />} {p.applyPlan}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {projectModal}
    </div>
  )
}
