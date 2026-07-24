"use client"

import type { DashboardDocument, DashboardQuickAction, DashboardRecommendation } from "@/src/app/actions/dashboard"
import { addDashboardTask, sendStatefulCopilotMessage, toggleDashboardTask } from "@/src/app/actions/dashboard"
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Plus,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

interface Task {
  id: string
  title: string
  tag: string
  done: boolean
}

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

export function DashboardWorkspace({
  startup,
  project,
  initialTasks,
  conversationId,
  initialMessages,
  overview,
}: {
  startup: any
  project: any
  initialTasks: Task[]
  conversationId: string
  initialMessages: Message[]
  overview: any
}) {
  const router = useRouter()
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks)
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const [newTaskTag, setNewTaskTag] = React.useState("Custom")
  const [showAddTask, setShowAddTask] = React.useState(false)

  const [copilotMessages, setCopilotMessages] = React.useState<Message[]>(initialMessages)
  const [question, setQuestion] = React.useState("")
  const [copilotLoading, setCopilotLoading] = React.useState(false)

  const chatEndRef = React.useRef<HTMLDivElement>(null)

  const completed = tasks.filter((t) => t.done).length
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const healthScore = overview?.healthScore ?? 0
  const healthLabel = overview?.healthLabel ?? "Building"
  const recommendations: DashboardRecommendation[] = overview?.recommendations ?? []
  const documents: DashboardDocument[] = overview?.documents ?? []
  const quickActions: DashboardQuickAction[] = overview?.quickActions ?? []

  React.useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  React.useEffect(() => {
    setCopilotMessages(initialMessages)
  }, [initialMessages])

  // Scroll to bottom of chat when new message arrives
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [copilotMessages, copilotLoading])

  async function handleToggle(taskId: string, currentStatus: boolean) {
    // Optimistic UI update
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, done: !currentStatus } : t)))
    await toggleDashboardTask(project.id, taskId, !currentStatus)
    router.refresh()
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const tempId = `task-${Date.now()}`
    const newTask: Task = { id: tempId, title: newTaskTitle.trim(), tag: newTaskTag, done: false }
    setTasks((current) => [...current, newTask])
    setNewTaskTitle("")
    setShowAddTask(false)

    await addDashboardTask(project.id, newTask.title, newTask.tag)
    router.refresh()
  }

  async function handleAskCopilot(e: React.FormEvent) {
    e.preventDefault()
    const prompt = question.trim()
    if (!prompt || copilotLoading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    }

    setCopilotMessages((prev) => [...prev, userMsg])
    setQuestion("")
    setCopilotLoading(true)

    try {
      const reply = await sendStatefulCopilotMessage(project.id, conversationId, prompt)
      setCopilotMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply,
        },
      ])
      router.refresh()
    } catch (err) {
      console.error("Copilot error:", err)
    } finally {
      setCopilotLoading(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 font-sans max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-green-700 dark:bg-green-950/60 dark:text-green-300">
              {startup.industry || "African Startup"}
            </span>
            <span className="text-xs text-zinc-400">&bull; {startup.city || startup.country_code || "Africa"}</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            {startup.name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Active focus: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{project.title}</span>
          </p>
        </div>

        <button
          onClick={() => document.getElementById("copilot")?.scrollIntoView({ behavior: "smooth" })}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-green-800 hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Sparkles className="size-4 text-green-200 animate-pulse" /> Ask Copilot
        </button>
      </div>

      {/* Progress & Focus Metrics */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Validation Score */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-green-900 via-green-900 to-emerald-950 p-6 sm:p-8 text-white shadow-lg lg:col-span-7 flex flex-col justify-between">
          <div className="absolute -right-12 -top-12 size-48 rounded-full bg-green-400/10 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-sm space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-green-300">
                <TrendingUp className="size-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-200/80">Business Brief Validation</p>
              <h2 className="text-4xl font-extrabold tracking-tight">
                {Math.min(100, progress + 44)}
                <span className="text-lg text-green-200 font-normal">/100</span>
              </h2>
              <p className="text-xs text-green-100/70 leading-relaxed">
                Onboarding completed for {startup.name}. Complete your active milestones below to validate your pricing hypothesis and local market setup.
              </p>
            </div>
            <div className="flex size-32 shrink-0 items-center justify-center rounded-full border-8 border-green-400/20 bg-white/5 text-center sm:self-center">
              <div>
                <span className="block text-2xl font-bold">{progress}%</span>
                <span className="text-[10px] text-green-100/70 uppercase font-semibold tracking-wider">Milestones</span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Focus */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-5 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Market Adaptation Focus</h3>
              <p className="text-xs text-zinc-500">Key launch indicators</p>
            </div>
            <Target className="size-5 text-green-600" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Value Proposition Setup</span>
                <span>80%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: "80%" }} />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Infrastructure & Mobile Money</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Financial Budget Runway</span>
                <span>35%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: "35%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Items List */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-green-700" />
              <h2 className="font-bold text-zinc-900 dark:text-white text-base">Active Launch Milestones</h2>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950/50 dark:text-green-300 w-fit">
              {completed} of {tasks.length} completed
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => (
              <label key={task.id} className="flex cursor-pointer items-start gap-4 py-3.5 first:pt-0 group">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => handleToggle(task.id, task.done)}
                  className="sr-only"
                />
                <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 text-white transition ${
                  task.done 
                    ? "border-green-600 bg-green-600" 
                    : "border-zinc-300 dark:border-zinc-700 group-hover:border-green-600"
                }`}>
                  <Check className={`size-3.5 transition-transform ${task.done ? "scale-100" : "scale-0"}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold transition ${task.done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-100 group-hover:text-green-700 dark:group-hover:text-green-400"}`}>
                    {task.title}
                  </span>
                  <span className="mt-1 inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800">
                    {task.tag}
                  </span>
                </div>
                <ChevronRight className="size-4 text-zinc-300 transition-transform group-hover:translate-x-1 shrink-0 mt-1" />
              </label>
            ))}
          </div>

          {!showAddTask ? (
            <button
              onClick={() => setShowAddTask(true)}
              className="inline-flex items-center gap-2 text-xs font-bold text-green-700 transition hover:text-green-800"
            >
              <Plus className="size-4" /> Add custom milestone
            </button>
          ) : (
            <form onSubmit={handleAddTask} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Milestone description..."
                className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
              />
              <select
                value={newTaskTag}
                onChange={(e) => setNewTaskTag(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="Research">Research</option>
                <option value="Strategy">Strategy</option>
                <option value="Planning">Planning</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Custom">Custom</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="h-10 rounded-xl bg-green-700 px-4 text-xs font-semibold text-white hover:bg-green-800 transition">
                  Save
                </button>
                <button type="button" onClick={() => setShowAddTask(false)} className="h-10 rounded-xl border border-zinc-200 px-4 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Sidebar Info */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-zinc-200 border-l-4 border-l-amber-500 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-5 text-amber-500" />
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Strategic Insight</h3>
            </div>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
              Validate your pricing & offer directly with first customer interviews before committing to heavy infrastructure setup.
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Matching payment prompts to local Mobile Money networks reduces checkout drop-off by up to 40%.
            </p>
          </div>

          <div className="rounded-3xl border border-green-200/60 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/30 p-6 space-y-2">
            <div className="flex items-center gap-2 text-green-900 dark:text-green-300">
              <CircleDollarSign className="size-5" />
              <h3 className="font-bold text-sm">Capital & Budget</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Starting budget: <strong className="text-zinc-900 dark:text-white">{(startup.estimated_budget_cents || 0) / 100} {startup.budget_currency || "USD"}</strong>
            </p>
          </div>
        </aside>
      </section>

      {/* Business Health & AI Recommendations */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-700">Health Score</p>
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">{healthScore}/100</h3>
              <p className="text-xs text-zinc-500">{healthLabel}</p>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950/40 dark:text-green-300">
              {progress}% completed
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-green-600 transition-all duration-500" style={{ width: `${healthScore}%` }} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Startup</span>
              <p className="mt-1 font-bold text-sm text-zinc-900 dark:text-white">{startup.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{startup.industry || "General"} &bull; {startup.city || startup.country_code}</p>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Project</span>
              <p className="mt-1 font-bold text-sm text-zinc-900 dark:text-white truncate">{project.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500 truncate">{project.description || "In validation phase"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-linear-to-br from-green-800 to-emerald-950 p-6 text-white shadow-lg lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-green-700/50 pb-3">
            <Sparkles className="size-5 text-green-300" />
            <h3 className="font-bold text-base">AI Strategic Recommendations</h3>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="rounded-2xl bg-white/10 p-4 backdrop-blur-xs space-y-1">
                <h4 className="font-bold text-xs text-green-200">{rec.title}</h4>
                <p className="text-xs text-green-50/80 leading-relaxed">{rec.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Documents & Quick Actions */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <FileText className="size-5 text-green-700" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Knowledge & Documents</h3>
          </div>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div>
                  <h4 className="font-semibold text-xs text-zinc-900 dark:text-white">{doc.title}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">{doc.summary}</p>
                </div>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700 dark:bg-green-950/40 dark:text-green-300 shrink-0">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <Zap className="size-5 text-amber-500" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            {quickActions.map((action, idx) => (
              <Link
                key={idx}
                href={action.href}
                className="group flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 transition hover:border-green-600/30 hover:bg-green-50/20 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <div>
                  <h4 className="font-semibold text-xs text-zinc-900 dark:text-white group-hover:text-green-700 transition">{action.label}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">{action.description}</p>
                </div>
                <ArrowRight className="size-4 text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-green-700 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live Copilot Chat Section */}
      <section
        id="copilot"
        className="rounded-3xl border border-green-200 bg-white p-6 shadow-md dark:border-green-900/40 dark:bg-zinc-900 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50">
              <MessageSquareText className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base">Ask Your Startup Copilot</h2>
              <p className="text-xs text-zinc-500">24/7 AI advisor for African business decisions</p>
            </div>
          </div>
        </div>

        {/* Message history */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 [scrollbar-width:thin]">
          {copilotMessages.filter((m) => m.role !== "system").length === 0 && !copilotLoading && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
              Ask about your target market, pricing strategy, Mobile Money setup, or fundraising steps.
            </div>
          )}

          {copilotMessages
            .filter((m) => m.role !== "system")
            .map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-green-700 text-white rounded-tr-none"
                      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

          {copilotLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-xs text-zinc-500">
                <Loader2 className="size-4 animate-spin text-green-600" />
                Copilot is thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleAskCopilot} className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask your copilot anything about your business..."
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={copilotLoading || !question.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white transition hover:bg-green-800 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        </form>
      </section>
    </div>
  )
}
