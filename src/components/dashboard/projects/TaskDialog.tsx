"use client"

import { Loader2, Send, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  addTaskComment,
  deleteTaskComment,
  listTaskComments,
  type ExecutionMember,
  type TaskComment,
  type TaskPatch,
} from "@/src/app/actions/execution"
import { Modal } from "@/src/components/ui/overlay"
import { Field, inputClass, primaryButtonClass, secondaryButtonClass, textareaClass } from "@/src/components/ui/page"
import type { TaskPriority, TaskStatus } from "@/src/lib/database.v2.types"
import { TASK_PRIORITIES, TASK_STATUSES, type ExecutionMilestone, type ExecutionTask } from "@/src/lib/execution"
import { useI18n } from "@/src/lib/i18n/client"
import { cn } from "@/src/lib/utils"

export type TaskDraft = {
  id?: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  milestoneId: string
  dueDate: string
  blockedReason: string
}

export function draftFromTask(task?: ExecutionTask | null, status: TaskStatus = "todo"): TaskDraft {
  return {
    id: task?.id,
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? status,
    priority: task?.priority ?? "medium",
    assigneeId: task?.assignee_id ?? "",
    milestoneId: task?.milestone_id ?? "",
    dueDate: task?.due_date ?? "",
    blockedReason: task?.blocked_reason ?? "",
  }
}

export function draftToPatch(draft: TaskDraft): TaskPatch & { title: string } {
  return {
    title: draft.title,
    description: draft.description,
    status: draft.status,
    priority: draft.priority,
    assigneeId: draft.assigneeId || null,
    milestoneId: draft.milestoneId || null,
    dueDate: draft.dueDate || null,
    blockedReason: draft.status === "blocked" ? draft.blockedReason || null : null,
  }
}

/** Create or edit a task; existing tasks also show their comment thread. */
export function TaskDialog({
  draft,
  onChange,
  onClose,
  onSubmit,
  onDelete,
  saving,
  members,
  milestones,
  currentUserId,
  canEdit,
  canComment,
}: {
  draft: TaskDraft | null
  onChange: (draft: TaskDraft) => void
  onClose: () => void
  onSubmit: () => void
  onDelete: (taskId: string) => void
  saving: boolean
  members: ExecutionMember[]
  milestones: ExecutionMilestone[]
  currentUserId: string
  canEdit: boolean
  canComment: boolean
}) {
  const { t, locale } = useI18n()
  const p = t.projects
  const [comments, setComments] = React.useState<TaskComment[] | null>(null)
  const [comment, setComment] = React.useState("")
  const [posting, setPosting] = React.useState(false)
  const taskId = draft?.id

  React.useEffect(() => {
    setComment("")
    if (!taskId) {
      setComments(null)
      return
    }
    let cancelled = false
    setComments(null)
    listTaskComments(taskId).then((rows) => {
      if (!cancelled) setComments(rows)
    })
    return () => {
      cancelled = true
    }
  }, [taskId])

  const memberName = (id: string | null) => members.find((m) => m.userId === id)?.name ?? p.formerMember

  async function postComment(event: React.FormEvent) {
    event.preventDefault()
    if (!taskId || !comment.trim() || posting) return
    setPosting(true)
    const result = await addTaskComment(taskId, comment)
    setPosting(false)
    if (!result.success) return void toast.error(result.error)
    setComments((list) => [...(list ?? []), result.comment])
    setComment("")
  }

  async function removeComment(id: string) {
    const result = await deleteTaskComment(id)
    if (!result.success) return void toast.error(result.error)
    setComments((list) => (list ?? []).filter((item) => item.id !== id))
  }

  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      title={draft?.id ? p.editTask : p.newTask}
      closeLabel={t.common.close}
      size="lg"
    >
      {draft && (
        <div className="space-y-6">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
            className="space-y-4"
          >
            <fieldset disabled={!canEdit} className="space-y-4">
              <Field label={p.taskTitle} htmlFor="task-title">
                <input id="task-title" required maxLength={200} value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} className={inputClass} />
              </Field>
              <Field label={p.description} htmlFor="task-description">
                <textarea id="task-description" rows={3} maxLength={4000} value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} className={textareaClass} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={p.status} htmlFor="task-status">
                  <select id="task-status" value={draft.status} onChange={(e) => onChange({ ...draft, status: e.target.value as TaskStatus })} className={inputClass}>
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {p.statuses[status]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={p.priority} htmlFor="task-priority">
                  <select id="task-priority" value={draft.priority} onChange={(e) => onChange({ ...draft, priority: e.target.value as TaskPriority })} className={inputClass}>
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {p.priorities[priority]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={p.dueDate} htmlFor="task-due">
                  <input id="task-due" type="date" value={draft.dueDate} onChange={(e) => onChange({ ...draft, dueDate: e.target.value })} className={inputClass} />
                </Field>
                <Field label={p.assignee} htmlFor="task-assignee">
                  <select id="task-assignee" value={draft.assigneeId} onChange={(e) => onChange({ ...draft, assigneeId: e.target.value })} className={inputClass}>
                    <option value="">{t.common.unassigned}</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                        {member.userId === currentUserId ? ` (${t.common.you})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={p.milestone} htmlFor="task-milestone" className="sm:col-span-2">
                  <select id="task-milestone" value={draft.milestoneId} onChange={(e) => onChange({ ...draft, milestoneId: e.target.value })} className={inputClass}>
                    <option value="">{p.noMilestone}</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {draft.status === "blocked" && (
                <Field label={p.blockedReason} htmlFor="task-blocked">
                  <input id="task-blocked" maxLength={500} value={draft.blockedReason} onChange={(e) => onChange({ ...draft, blockedReason: e.target.value })} placeholder={p.blockedPlaceholder} className={inputClass} />
                </Field>
              )}
            </fieldset>

            {canEdit && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {draft.id ? (
                  <button type="button" onClick={() => onDelete(draft.id!)} className={cn(secondaryButtonClass, "text-red-600 dark:text-red-400")}>
                    <Trash2 className="size-4" /> {t.common.delete}
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={onClose} className={secondaryButtonClass}>
                    {t.common.cancel}
                  </button>
                  <button type="submit" disabled={saving} className={primaryButtonClass}>
                    {saving && <Loader2 className="size-4 animate-spin" />} {t.common.save}
                  </button>
                </div>
              </div>
            )}
          </form>

          {draft.id && (
            <section aria-labelledby="task-comments" className="border-t border-border pt-5">
              <h3 id="task-comments" className="text-sm font-semibold text-foreground">
                {p.comments}
              </h3>
              {comments === null ? (
                <Loader2 className="mt-3 size-4 animate-spin text-muted-foreground" />
              ) : comments.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{p.noComments}</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {comments.map((item) => (
                    <li key={item.id} className="group rounded-lg bg-muted/60 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{memberName(item.authorId)}</span> ·{" "}
                          {new Date(item.createdAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                        {item.authorId === currentUserId && (
                          <button type="button" aria-label={t.common.delete} onClick={() => removeComment(item.id)} className="text-muted-foreground opacity-60 hover:text-red-600 group-hover:opacity-100">
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{item.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              {canComment && (
                <form onSubmit={postComment} className="mt-3 flex gap-2">
                  <input aria-label={p.addComment} value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} placeholder={p.addComment} className={inputClass} />
                  <button type="submit" disabled={posting || !comment.trim()} aria-label={p.addComment} className={cn(primaryButtonClass, "shrink-0 px-3")}>
                    {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </button>
                </form>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}
