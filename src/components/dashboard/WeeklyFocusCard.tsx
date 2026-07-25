"use client"

import {
  completeWeeklyCheckIn,
  regenerateWeeklyFocusPlan,
  toggleFocusPriority,
} from "@/src/app/actions/focus-plan"
import { withPreservedMainScroll } from "@/src/components/dashboard/DashboardScrollLock"
import {
  focusPlanProgress,
  formatWeekLabel,
  type WeeklyFocusPlan,
} from "@/src/lib/focus-plan"
import { Check, Loader2, RefreshCw, Target } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

export function WeeklyFocusCard({
  projectId,
  initialPlan,
}: {
  projectId: string
  initialPlan: WeeklyFocusPlan | null
}) {
  const [plan, setPlan] = React.useState(initialPlan)
  const [busy, setBusy] = React.useState<"ai" | "derived" | "checkin" | string | null>(null)
  const [note, setNote] = React.useState(initialPlan?.checkIn?.note ?? "")

  React.useEffect(() => {
    setPlan(initialPlan)
    setNote(initialPlan?.checkIn?.note ?? "")
  }, [initialPlan])

  if (!plan) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/80 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
        Your weekly focus plan will appear here once the project is ready.
      </div>
    )
  }

  const progress = focusPlanProgress(plan)
  const doneCount = plan.priorities.filter((p) => p.done).length

  async function handleToggle(id: string, done: boolean) {
    setBusy(id)
    // Optimistic
    setPlan((current) =>
      current
        ? {
            ...current,
            priorities: current.priorities.map((p) => (p.id === id ? { ...p, done } : p)),
          }
        : current,
    )
    const res = await toggleFocusPriority(projectId, id, done)
    setBusy(null)
    if (!res.success) {
      toast.error(res.error)
      setPlan(initialPlan)
      return
    }
    setPlan(res.plan)
  }

  async function handleRegenerate(mode: "ai" | "derived") {
    setBusy(mode)
    await withPreservedMainScroll(async () => {
      const res = await regenerateWeeklyFocusPlan(projectId, mode === "ai" ? "ai" : "derived")
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setPlan(res.plan)
      setNote("")
      toast.success(mode === "ai" ? "AI focus plan ready" : "Plan refreshed from milestones")
    })
    setBusy(null)
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy("checkin")
    const res = await completeWeeklyCheckIn(projectId, note)
    setBusy(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setPlan(res.plan)
    toast.success("Weekly check-in saved")
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Target className="size-5 text-green-700" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">This week&apos;s focus</h2>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {plan.source === "projected" ? "AI plan" : "Derived"}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {formatWeekLabel(plan.weekStart)} · {doneCount}/3 done · Pick three outcomes and finish them before adding more work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => handleRegenerate("derived")}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {busy === "derived" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            From milestones
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => handleRegenerate("ai")}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-green-700 px-3 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {busy === "ai" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            AI refresh
          </button>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-green-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {plan.priorities.map((priority, index) => (
          <li key={priority.id}>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => handleToggle(priority.id, !priority.done)}
              className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 text-left transition hover:border-green-200 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-green-900/40"
            >
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 text-white ${
                  priority.done ? "border-green-600 bg-green-600" : "border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {busy === priority.id ? (
                  <Loader2 className="size-3 animate-spin text-green-700" />
                ) : (
                  <Check className={`size-3.5 ${priority.done ? "scale-100" : "scale-0"}`} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Priority {index + 1}</p>
                <p
                  className={`mt-0.5 text-sm font-semibold ${
                    priority.done ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-white"
                  }`}
                >
                  {priority.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{priority.why}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCheckIn} className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Weekly check-in
        </label>
        <p className="mt-1 text-xs text-zinc-400">
          What moved? What blocked you? Saved as tracked notes for this week.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. Spoke to 2 shop owners; MoMo test still pending…"
          className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!!busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy === "checkin" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {plan.checkIn ? "Update check-in" : "Save check-in"}
          </button>
          {plan.checkIn && (
            <span className="text-[11px] text-zinc-400">
              Last saved {new Date(plan.checkIn.completedAt).toLocaleString()}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}
