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

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh()
    }, 10000)

    return () => window.clearInterval(interval)
  }, [router])

  async function handleToggle(taskId: string, currentStatus: boolean) {
    // Optimistic UI update
    setTasks((current) => current.map((t) => t.id === taskId ? { ...t, done: !currentStatus } : t))
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
      console.error(err)
    } finally {
      setCopilotLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-700">Founder workspace &mdash; {startup.name}</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
            Building for {startup.city || "Africa"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Current active focus: <span className="font-semibold text-green-800 dark:text-green-400">{project.title}</span>
          </p>
        </div>
        <button
          onClick={() => document.getElementById("copilot")?.scrollIntoView({ behavior: "smooth" })}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white shadow-lg shadow-green-900/10 hover:shadow-green-900/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:bg-green-800"
        >
          <Sparkles className="size-4 animate-pulse" /> Ask your copilot
        </button>
      </div>

      {/* Progress & Focus Metrics */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative overflow-hidden rounded-3xl bg-[#0b3327] p-8 text-white shadow-xl transition-all duration-500 hover:shadow-2xl hover:shadow-[#0b3327]/10">
          <div className="absolute -right-14 -top-16 size-56 rounded-full bg-green-400/15 blur-2xl" />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-sm">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-green-400/15 text-green-300 shadow-inner">
                <TrendingUp className="size-5" />
              </div>
              <p className="mt-5 text-sm font-medium text-green-100/70">Your business brief validation</p>
              <h2 className="mt-1 text-4xl font-semibold tracking-tight">
                {progress + 44}
                <span className="text-xl text-green-200">/100</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-green-50/75">
                Onboarding complete. Let&apos;s complete your action items to validate your pricing hypothesis and local market setup.
              </p>
            </div>
            <div className="flex size-36 shrink-0 items-center justify-center rounded-full border-[11px] border-green-400/20 bg-white/5 text-center transition-transform duration-500 hover:rotate-3">
              <div>
                <span className="block text-2xl font-bold">{progress}%</span>
                <span className="text-xs text-green-100/70">roadmap done</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-500 hover:shadow-md hover:border-zinc-300/40 dark:hover:border-zinc-700/60">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">Market adaptation focus</h3>
              <p className="mt-1 text-xs text-zinc-500">Milestones aligned with local conditions.</p>
            </div>
            <Target className="size-5 text-green-700" />
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Value proposition setup</span>
                <span>80%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: "80%" }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Infrastructure & Payments (Mobile Money)</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Financial assumptions & budget runway</span>
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
      <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 transition-all duration-500 hover:shadow-md hover:border-zinc-300/40 dark:hover:border-zinc-700/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-green-700" />
                <h2 className="font-semibold text-zinc-900 dark:text-white">Active Roadmap Milestones</h2>
              </div>
              <p className="mt-1 text-sm text-zinc-500">Complete these to move your business forward.</p>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950/40 dark:text-green-400 shadow-sm">
              {completed} of {tasks.length} done
            </span>
          </div>

          <div className="mt-6 divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {tasks.map((task) => (
              <label key={task.id} className="flex cursor-pointer items-center gap-4 py-4 first:pt-0 group">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => handleToggle(task.id, task.done)}
                  className="peer sr-only"
                />
                <span className={`flex size-5 items-center justify-center rounded-md border-2 text-white transition-all duration-300 ${
                  task.done 
                    ? "border-green-600 bg-green-600 scale-105" 
                    : "border-zinc-300 dark:border-zinc-700 group-hover:border-green-600"
                }`}>
                  <Check className={`size-3.5 transition-transform duration-300 ${task.done ? "scale-100" : "scale-0"}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold transition-all duration-300 ${task.done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-100 group-hover:text-green-800 dark:group-hover:text-green-400"}`}>
                    {task.title}
                  </span>
                  <span className="mt-1.5 inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800">
                    {task.tag}
                  </span>
                </span>
                <ChevronRight className="size-4 text-zinc-400 transition-transform duration-300 group-hover:translate-x-1" />
              </label>
            ))}
          </div>

          {!showAddTask ? (
            <button
              onClick={() => setShowAddTask(true)}
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-green-700 transition hover:text-green-800 hover:scale-[1.01]"
            >
              <Plus className="size-4" /> Add custom milestone
            </button>
          ) : (
            <form onSubmit={handleAddTask} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Milestone description..."
                className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-1 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
              />
              <select
                value={newTaskTag}
                onChange={(e) => setNewTaskTag(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="Research">Research</option>
                <option value="Strategy">Strategy</option>
                <option value="Planning">Planning</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Custom">Custom</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="h-10 rounded-xl bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  Save
                </button>
                <button type="button" onClick={() => setShowAddTask(false)} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 border-l-4 border-l-amber-500 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-500 hover:shadow-md">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-5 text-amber-500" />
              <h2 className="font-semibold text-zinc-900 dark:text-white">Active Insight</h2>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-zinc-800 dark:text-zinc-100">
              Speak with potential customers before you commit to building a large scale offering.
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Adapting your value proposition to local cash-flow cycles will ensure easier customer retention.
            </p>
          </div>
          <div className="rounded-3xl border border-green-200/50 bg-[#eaf5ee] dark:bg-green-950/20 dark:border-green-900/30 p-6 transition-all duration-500 hover:shadow-md">
            <div className="flex items-center gap-2 text-green-900 dark:text-green-300">
              <CircleDollarSign className="size-5" />
              <h2 className="font-semibold">Financial Settings</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-green-950/80 dark:text-green-100/80">
              Budget is configured to <span className="font-bold">{(startup.estimated_budget_cents || 0) / 100} {startup.budget_currency || "USD"}</span>.
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-500 hover:shadow-md hover:border-zinc-300/40 dark:hover:border-zinc-700/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-700">Business Health Score</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">{healthScore}/100</h2>
              <p className="mt-2 text-sm text-zinc-500">{healthLabel}</p>
            </div>
            <div className="rounded-2xl bg-green-50 px-3.5 py-2 text-xs font-bold text-green-700 dark:bg-green-950/40 dark:text-green-300 shadow-sm">
              {progress}% roadmap complete
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-green-600 transition-all duration-500" style={{ width: `${healthScore}%` }} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50 border border-zinc-100/50 dark:border-zinc-800/50 transition-all duration-300 hover:bg-zinc-100/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Current business</p>
              <p className="mt-2 font-bold text-zinc-900 dark:text-white">{startup.name}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{project.title}</p>
              <p className="mt-2 text-xs text-zinc-400 font-medium">
                {startup.industry || "Industry not set"} • {startup.city || startup.country_code || "Location pending"}
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50 border border-zinc-100/50 dark:border-zinc-800/50 transition-all duration-300 hover:bg-zinc-100/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active focus</p>
              <p className="mt-2 font-bold text-zinc-900 dark:text-white line-clamp-1">{project.description || "Project details are being refined"}</p>
              <p className="mt-1.5 text-xs text-zinc-500">
                Budget: {(startup.estimated_budget_cents || 0) / 100} {startup.budget_currency || "USD"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-green-700 to-emerald-800 p-6 text-white shadow-xl transition-all duration-500 hover:shadow-2xl hover:shadow-green-950/20">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5" />
            <h2 className="font-semibold">AI recommendations</h2>
          </div>
          <div className="mt-5 space-y-3">
            {recommendations.map((recommendation) => (
              <div key={recommendation.title} className="rounded-2xl bg-white/10 p-4 border border-white/5 transition-all duration-300 hover:bg-white/15 hover:scale-[1.01]">
                <p className="font-bold text-sm">{recommendation.title}</p>
                <p className="mt-1 text-xs text-green-50/85 leading-relaxed">{recommendation.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-500 hover:shadow-md hover:border-zinc-300/40 dark:hover:border-zinc-700/60">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-green-700" />
            <h2 className="font-semibold text-zinc-900 dark:text-white">Generated documents</h2>
          </div>
          <div className="mt-5 space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="group/doc flex items-start justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition-all duration-300 hover:border-green-600/20 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80">
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white group-hover/doc:text-green-800 dark:group-hover/doc:text-green-400 transition-colors">{document.title}</p>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{document.summary}</p>
                </div>
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-green-700 dark:bg-green-950/40 dark:text-green-300 shrink-0">
                  {document.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-500 hover:shadow-md hover:border-zinc-300/40 dark:hover:border-zinc-700/60">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            <h2 className="font-semibold text-zinc-900 dark:text-white">Quick actions</h2>
          </div>
          <div className="mt-5 space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group flex items-center justify-between rounded-2xl border border-zinc-200/60 bg-zinc-50/55 p-4 transition-all duration-300 hover:border-green-600/30 hover:bg-green-50/30 hover:scale-[1.01] hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/55 dark:hover:bg-green-950/10"
              >
                <div>
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white group-hover:text-green-800 dark:group-hover:text-green-400 transition-colors">{action.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{action.description}</p>
                </div>
                <ArrowRight className="size-4 text-zinc-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-green-700" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live AI Copilot chat */}
      <section
        id="copilot"
        className="rounded-3xl border border-green-100 bg-white p-6 shadow-md dark:border-green-950 dark:bg-zinc-900 sm:p-8 transition-all duration-500 hover:shadow-lg"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50">
                <MessageSquareText className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-white">Startup Copilot Chat</h2>
                <p className="text-xs text-zinc-500">Your thinking partner for the next decision.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message history */}
        <div className="mt-6 space-y-4 max-h-[350px] overflow-y-auto border-t border-zinc-100/80 pt-5 dark:border-zinc-800 pr-2">
          {copilotMessages.filter(m => m.role !== "system").length === 0 && !copilotLoading && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 leading-relaxed">
              Ask about your market, pricing, first customers, or next move and I&apos;ll help you think it through.
            </div>
          )}
          {copilotMessages.filter(m => m.role !== "system").map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-all duration-300 ${
                msg.role === "user" 
                  ? "bg-green-700 text-white rounded-tr-none hover:shadow-green-700/10" 
                  : "bg-zinc-50 text-zinc-800 border border-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/50 rounded-tl-none"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {copilotLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="flex items-center gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 p-3.5 text-xs text-zinc-400 font-medium">
                <span className="size-4 animate-bounce rounded-full  bg-green-700" />
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleAskCopilot} className="mt-6 flex gap-3">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about your business..."
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={copilotLoading}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white transition-all duration-300 hover:bg-green-800 hover:scale-105 active:scale-95 disabled:opacity-50"
            aria-label="Send question"
          >
            <Send className="size-4" />
          </button>
        </form>
      </section>
    </div>
  )
}
