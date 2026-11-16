"use client"

import {
  addDashboardTask,
  deleteDashboardTask,
  toggleDashboardTask,
  updateDashboardTask,
  type DashboardTask,
  type TaskAssignee,
} from "@/src/app/actions/dashboard"
import { cn } from "@/src/lib/utils"
import { CalendarDays, Check, ClipboardCheck, Plus, Trash2, UserRound } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

const TAGS = ["Research", "Strategy", "Planning", "Infrastructure", "Marketing", "Custom"]

type Filter = "all" | "mine" | "open"

/** Today as YYYY-MM-DD in the viewer's own timezone. */
function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function formatDue(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

const fieldClass =
  "h-8 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"

export function MilestoneList({
  projectId,
  tasks,
  onTasksChange,
  members,
  currentUserId,
}: {
  projectId: string
  tasks: DashboardTask[]
  onTasksChange: React.Dispatch<React.SetStateAction<DashboardTask[]>>
  members: TaskAssignee[]
  currentUserId: string
}) {
  const [filter, setFilter] = React.useState<Filter>("all")
  const [showAdd, setShowAdd] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState("")
  const [newTag, setNewTag] = React.useState("Custom")
  const [newAssignee, setNewAssignee] = React.useState("")
  const [newDue, setNewDue] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const today = todayIso()
  const isTeam = members.length > 1
  const memberById = React.useMemo(() => new Map(members.map((m) => [m.userId, m])), [members])
  const completed = tasks.filter((t) => t.done).length
  const mineOpen = tasks.filter((t) => t.assigneeId === currentUserId && !t.done).length

  const visible = tasks.filter((task) => {
    if (filter === "mine") return task.assigneeId === currentUserId
    if (filter === "open") return !task.done
    return true
  })

  const patchLocal = (taskId: string, patch: Partial<DashboardTask>) =>
    onTasksChange((current) => current.map((t) => (t.id === taskId ? { ...t, ...patch } : t)))

  async function handleToggle(task: DashboardTask) {
    patchLocal(task.id, { done: !task.done })
    const ok = await toggleDashboardTask(projectId, task.id, !task.done)
    if (!ok) {
      patchLocal(task.id, { done: task.done })
      toast.error("Could not update the milestone. Please try again.")
    }
  }

  async function handleUpdate(task: DashboardTask, patch: { assigneeId?: string | null; dueDate?: string | null }) {
    patchLocal(task.id, patch)
    const res = await updateDashboardTask(projectId, task.id, patch)
    if (!res.success) {
      // Put back exactly what was there before this edit.
      patchLocal(task.id, { assigneeId: task.assigneeId ?? null, dueDate: task.dueDate ?? null })
      toast.error(res.error)
    }
  }

  async function handleDelete(task: DashboardTask) {
    if (!window.confirm(`Delete “${task.title}”?`)) return
    const index = tasks.findIndex((t) => t.id === task.id)
    onTasksChange((current) => current.filter((t) => t.id !== task.id))
    const ok = await deleteDashboardTask(projectId, task.id)
    if (!ok) {
      onTasksChange((current) => {
        if (current.some((t) => t.id === task.id)) return current
        const next = current.slice()
        next.splice(Math.min(index, next.length), 0, task)
        return next
      })
      toast.error("Could not delete the milestone. Please try again.")
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || saving) return
    setSaving(true)
    const created = await addDashboardTask(projectId, title, newTag, {
      assigneeId: newAssignee || null,
      dueDate: newDue || null,
    })
    setSaving(false)
    if (!created) {
      toast.error("Could not add the milestone. Please try again.")
      return
    }
    // Use the server's task (real id) so it can be edited straight away.
    onTasksChange((current) => [...current, created])
    setNewTitle("")
    setNewAssignee("")
    setNewDue("")
    setShowAdd(false)
  }

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: `All (${tasks.length})` },
    { id: "open", label: `Open (${tasks.length - completed})` },
    ...(isTeam ? [{ id: "mine" as const, label: `Assigned to me (${mineOpen})` }] : []),
  ]

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:space-y-5 sm:rounded-3xl sm:p-6 lg:col-span-8">
      <div className="flex flex-col justify-between gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-5 text-green-700" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Active Launch Milestones</h2>
        </div>
        <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {completed} of {tasks.length} completed
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter milestones">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-bold transition",
              filter === item.id
                ? "bg-green-700 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visible.length === 0 && (
          <li className="py-6 text-center text-xs text-zinc-500">
            {filter === "mine" ? "Nothing is assigned to you right now." : "No milestones here yet."}
          </li>
        )}

        {visible.map((task) => {
          const overdue = Boolean(task.dueDate) && !task.done && (task.dueDate as string) < today
          const assignee = task.assigneeId ? memberById.get(task.assigneeId) : undefined
          // Someone who has since left the team still shows on their old tasks.
          const formerAssignee = Boolean(task.assigneeId) && !assignee

          return (
            <li key={task.id} className="group flex items-start gap-3 py-3.5 first:pt-0 sm:gap-4">
              <button
                type="button"
                role="checkbox"
                aria-checked={task.done}
                aria-label={`Mark “${task.title}” as ${task.done ? "not done" : "done"}`}
                onClick={() => handleToggle(task)}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 text-white transition",
                  task.done ? "border-green-600 bg-green-600" : "border-zinc-300 hover:border-green-600 dark:border-zinc-700",
                )}
              >
                <Check className={cn("size-3.5 transition-transform", task.done ? "scale-100" : "scale-0")} />
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    task.done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-100",
                  )}
                >
                  {task.title}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800">
                    {task.tag}
                  </span>

                  {isTeam && (
                    <label className="inline-flex items-center gap-1 text-zinc-400">
                      <UserRound className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">Assigned to</span>
                      <select
                        value={task.assigneeId ?? ""}
                        onChange={(e) => handleUpdate(task, { assigneeId: e.target.value || null })}
                        className={cn(fieldClass, task.assigneeId === currentUserId && "border-green-300 text-green-800 dark:border-green-800 dark:text-green-300")}
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.fullName}
                            {member.userId === currentUserId ? " (you)" : ""}
                          </option>
                        ))}
                        {formerAssignee && <option value={task.assigneeId as string}>Former member</option>}
                      </select>
                    </label>
                  )}

                  <label className={cn("inline-flex items-center gap-1", overdue ? "text-red-600" : "text-zinc-400")}>
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Due date</span>
                    <input
                      type="date"
                      value={task.dueDate ?? ""}
                      onChange={(e) => handleUpdate(task, { dueDate: e.target.value || null })}
                      className={cn(fieldClass, overdue && "border-red-300 text-red-700 dark:border-red-900 dark:text-red-400")}
                    />
                  </label>

                  {overdue && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      Overdue since {formatDue(task.dueDate as string)}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                aria-label={`Delete “${task.title}”`}
                onClick={() => handleDelete(task)}
                className="shrink-0 rounded-lg p-1.5 text-zinc-300 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 dark:text-zinc-600 dark:hover:bg-red-950/40 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>

      {!showAdd ? (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-green-700 transition hover:text-green-800"
        >
          <Plus className="size-4" /> Add custom milestone
        </button>
      ) : (
        <form onSubmit={handleAdd} className="space-y-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
          <input
            type="text"
            required
            autoFocus
            maxLength={200}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Milestone description..."
            aria-label="Milestone description"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select value={newTag} onChange={(e) => setNewTag(e.target.value)} aria-label="Category" className={cn(fieldClass, "h-10 px-3 text-xs")}>
              {TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            {isTeam && (
              <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} aria-label="Assign to" className={cn(fieldClass, "h-10 px-3 text-xs")}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName}
                    {member.userId === currentUserId ? " (you)" : ""}
                  </option>
                ))}
              </select>
            )}
            <input type="date" value={newDue} min={today} onChange={(e) => setNewDue(e.target.value)} aria-label="Due date" className={cn(fieldClass, "h-10 px-3 text-xs")} />
            <div className="ml-auto flex gap-2">
              <button type="submit" disabled={saving} className="h-10 cursor-pointer rounded-xl bg-green-700 px-4 text-xs font-semibold text-white transition hover:bg-green-800 disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="h-10 cursor-pointer rounded-xl border border-zinc-200 px-4 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
