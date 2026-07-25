export interface FocusPriority {
  id: string
  title: string
  why: string
  done: boolean
  linkedTaskId?: string
}

export interface WeeklyFocusPlan {
  weekStart: string
  generatedAt: string
  /** derived = from incomplete milestones; projected = AI-refined */
  source: "derived" | "projected"
  priorities: FocusPriority[]
  checkIn: { completedAt: string; note: string } | null
}

export function getWeekStartISO(date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const mondayOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - mondayOffset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`
}

export function isWeeklyFocusPlan(value: unknown): value is WeeklyFocusPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const plan = value as Partial<WeeklyFocusPlan>
  return (
    typeof plan.weekStart === "string" &&
    typeof plan.generatedAt === "string" &&
    (plan.source === "derived" || plan.source === "projected") &&
    Array.isArray(plan.priorities)
  )
}

export function readWeeklyFocusPlan(metadata: Record<string, unknown>): WeeklyFocusPlan | null {
  const raw = metadata.weekly_focus_plan
  return isWeeklyFocusPlan(raw) ? raw : null
}

export function buildDerivedFocusPlan(
  tasks: Array<{ id: string; title: string; tag: string; done: boolean }>,
  startupName: string,
): WeeklyFocusPlan {
  const incomplete = tasks.filter((t) => !t.done)
  const picked = incomplete.slice(0, 3)

  const fallbacks = [
    {
      title: "Talk to 3 target customers this week",
      why: `Validate demand for ${startupName || "your offer"} before spending more on build.`,
    },
    {
      title: "Confirm Mobile Money / payment path",
      why: "Checkout friction kills early African traction — pick one rail and test it.",
    },
    {
      title: "Write a one-page offer & price",
      why: "A clear offer makes every marketing and sales conversation sharper.",
    },
  ]

  const priorities: FocusPriority[] = []
  for (let i = 0; i < 3; i++) {
    const task = picked[i]
    if (task) {
      priorities.push({
        id: `focus-${task.id}`,
        title: task.title,
        why: `Pulled from your incomplete ${task.tag} milestone — finish this before adding more work.`,
        done: false,
        linkedTaskId: task.id,
      })
    } else {
      const fb = fallbacks[i]
      priorities.push({
        id: `focus-default-${i + 1}`,
        title: fb.title,
        why: fb.why,
        done: false,
      })
    }
  }

  return {
    weekStart: getWeekStartISO(),
    generatedAt: new Date().toISOString(),
    source: "derived",
    priorities,
    checkIn: null,
  }
}

export function focusPlanProgress(plan: WeeklyFocusPlan): number {
  if (!plan.priorities.length) return 0
  const done = plan.priorities.filter((p) => p.done).length
  return Math.round((done / plan.priorities.length) * 100)
}
