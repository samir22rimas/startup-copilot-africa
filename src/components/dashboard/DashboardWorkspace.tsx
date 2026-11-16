"use client"

import type { DashboardDocument, DashboardQuickAction, DashboardRecommendation } from "@/src/app/actions/dashboard"
import { sendStatefulCopilotMessage } from "@/src/app/actions/dashboard"
import type { DashboardOverview, DashboardTask, TaskAssignee } from "@/src/app/actions/dashboard"
import { MilestoneList } from "@/src/components/dashboard/MilestoneList"
import type { Database } from "@/src/lib/database.types"
import { WeeklyFocusCard } from "@/src/components/dashboard/WeeklyFocusCard"
import { CopilotMarkdown } from "@/src/components/dashboard/CopilotMarkdown"
import {
  ArrowRight,
  CircleDollarSign,
  FileText,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

type StartupRow = Database["public"]["Tables"]["startups"]["Row"]
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"]

type Task = DashboardTask

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

export function DashboardWorkspace({
  startup,
  project,
  initialTasks,
  teamMembers,
  currentUserId,
  conversationId,
  initialMessages,
  overview,
}: {
  startup: StartupRow
  project: ProjectRow
  initialTasks: Task[]
  teamMembers: TaskAssignee[]
  currentUserId: string
  conversationId: string
  initialMessages: Message[]
  overview: DashboardOverview
}) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks)

  const [copilotMessages, setCopilotMessages] = React.useState<Message[]>(initialMessages)
  const [question, setQuestion] = React.useState("")
  const [copilotLoading, setCopilotLoading] = React.useState(false)

  const chatListRef = React.useRef<HTMLDivElement>(null)
  const chatInputRef = React.useRef<HTMLTextAreaElement>(null)
  const userScrolledUp = React.useRef(false)

  const completed = tasks.filter((t) => t.done).length
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const healthScore = overview?.healthScore ?? 0
  const healthLabel = overview?.healthLabel ?? "Building"
  const healthFootnote =
    overview?.healthFootnote ??
    "Score is derived from onboarding and milestones — not live market traction"
  const focusIndicators = overview?.focusIndicators ?? []
  const weeklyFocus = overview?.weeklyFocus ?? null
  const trackedMetrics = overview?.trackedMetrics ?? null
  const recommendations: DashboardRecommendation[] = overview?.recommendations ?? []
  const documents: DashboardDocument[] = overview?.documents ?? []
  const quickActions: DashboardQuickAction[] = overview?.quickActions ?? []

  function scrollMainToCopilot() {
    const el = document.getElementById("copilot")
    const scroller = el?.closest("main")
    if (!el || !(scroller instanceof HTMLElement)) return

    const top =
      el.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      8

    window.scrollTo(0, 0)
    scroller.scrollTo({ top, behavior: "smooth" })
  }

  // Adopt fresh server data when the page re-renders (e.g. after switching project).
  const [syncedTasks, setSyncedTasks] = React.useState(initialTasks)
  if (syncedTasks !== initialTasks) {
    setSyncedTasks(initialTasks)
    setTasks(initialTasks)
  }
  const [syncedMessages, setSyncedMessages] = React.useState(initialMessages)
  if (syncedMessages !== initialMessages) {
    setSyncedMessages(initialMessages)
    setCopilotMessages(initialMessages)
  }

  // Auto-scroll to bottom whenever messages change, unless user has scrolled up
  React.useEffect(() => {
    const list = chatListRef.current
    if (!list) return
    if (!userScrolledUp.current) {
      list.scrollTop = list.scrollHeight
    }
  }, [copilotMessages, copilotLoading])

  // Track if the user scrolls up manually so we don't hijack their scroll position
  function handleChatScroll() {
    const list = chatListRef.current
    if (!list) return
    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight
    userScrolledUp.current = distanceFromBottom > 60
  }

  function resizeChatInput(input: HTMLTextAreaElement) {
    input.style.height = "auto"
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`
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

    // Reset scroll flag so the chat snaps to the new message
    userScrolledUp.current = false
    setCopilotMessages((prev) => [...prev, userMsg])
    setQuestion("")
    if (chatInputRef.current) chatInputRef.current.style.height = "auto"
    setCopilotLoading(true)

    const pushAssistant = (content: string) =>
      setCopilotMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content },
      ])

    try {
      const res = await sendStatefulCopilotMessage(project.id, conversationId, prompt)
      // Failures (rate limit, monthly allowance, provider outage) are shown in
      // the thread instead of leaving the question silently unanswered.
      pushAssistant(res.success ? res.reply : `**Copilot could not reply.** ${res.error}`)
    } catch (err) {
      console.error("Copilot error:", err)
      pushAssistant("**Copilot could not reply.** Something went wrong — please try again.")
    } finally {
      setCopilotLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-10 sm:pb-12 font-sans max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-green-700 dark:bg-green-950/60 dark:text-green-300">
              {startup.industry || "African Startup"}
            </span>
            <span className="text-xs text-zinc-400">&bull; {startup.city || startup.country_code || "Africa"}</span>
          </div>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl lg:text-3xl">
            {startup.name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Active focus: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{project.title}</span>
          </p>
        </div>

        <button
          onClick={scrollMainToCopilot}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-green-800 hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <Sparkles className="size-4 text-green-200 animate-pulse" /> Ask Copilot
        </button>
      </div>

      {/* Progress & Focus Metrics */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-br from-green-900 via-green-900 to-emerald-950 p-5 sm:p-6 lg:p-8 text-white shadow-lg lg:col-span-7 flex flex-col justify-between">
          <div className="absolute -right-8 -top-8 size-48 rounded-full bg-green-400/10 blur-xl pointer-events-none" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-sm space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-green-300">
                <TrendingUp className="size-5" />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-green-200/80">Workspace health</p>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-100">
                  Derived
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {healthScore}
                <span className="text-lg text-green-200 font-normal">/100</span>
              </h2>
              <p className="text-xs text-green-100/70 leading-relaxed">{healthFootnote}</p>
              {trackedMetrics && (
                <p className="text-[11px] text-green-200/90">
                  Includes tracked metrics: {trackedMetrics.activeCustomers} customers ·{" "}
                  {trackedMetrics.monthlyRevenue} {trackedMetrics.currency} revenue/mo
                </p>
              )}
            </div>
            <div className="flex size-24 sm:size-32 shrink-0 items-center justify-center rounded-full border-8 border-green-400/20 bg-white/5 text-center sm:self-center">
              <div>
                <span className="block text-2xl font-bold">{progress}%</span>
                <span className="text-[10px] text-green-100/70 uppercase font-semibold tracking-wider">Milestones</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-5 space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Launch readiness signals</h3>
              <p className="text-xs text-zinc-500">From your records — not invented percentages</p>
            </div>
            <Target className="size-5 text-green-600" />
          </div>

          <div className="space-y-4">
            {(focusIndicators.length > 0
              ? focusIndicators
              : [
                  {
                    label: "Milestone execution",
                    value: progress,
                    footnote: `${completed}/${tasks.length} complete`,
                    source: "derived" as const,
                  },
                ]
            ).map((indicator: { label: string; value: number; footnote: string; source: "derived" | "tracked" }) => (
              <div key={indicator.label}>
                <div className="mb-1.5 flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    {indicator.label}
                    <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800">
                      {indicator.source === "tracked" ? "Tracked" : "Derived"}
                    </span>
                  </span>
                  <span>{indicator.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      indicator.source === "tracked" ? "bg-emerald-600" : "bg-green-500"
                    }`}
                    style={{ width: `${indicator.value}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">{indicator.footnote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WeeklyFocusCard projectId={project.id} initialPlan={weeklyFocus} />

      {/* Action Items List */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <MilestoneList
          projectId={project.id}
          tasks={tasks}
          onTasksChange={setTasks}
          members={teamMembers}
          currentUserId={currentUserId}
        />

        {/* Right Sidebar Info */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl border border-zinc-200 border-l-4 border-l-amber-500 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
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
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-6 space-y-4">
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

        <div className="rounded-2xl sm:rounded-3xl bg-linear-to-br from-green-800 to-emerald-950 p-4 sm:p-6 text-white shadow-lg lg:col-span-6 space-y-4">
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
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-green-700" />
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Knowledge & Documents</h3>
            </div>
            <Link
              href="/dashboard/documents"
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              Manage vault
            </Link>
          </div>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40">
                No tracked uploads yet.{" "}
                <Link href="/dashboard/documents" className="font-semibold text-green-700 hover:underline">
                  Upload a document
                </Link>{" "}
                so Copilot can use your real materials.
              </div>
            ) : (
              documents.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div>
                  <h4 className="font-semibold text-xs text-zinc-900 dark:text-white">{doc.title}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">{doc.summary}</p>
                </div>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700 dark:bg-green-950/40 dark:text-green-300 shrink-0">
                  Tracked
                </span>
              </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-6 space-y-4">
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
        className="rounded-2xl sm:rounded-3xl border border-green-200 bg-white p-4 sm:p-6 lg:p-8 shadow-md dark:border-green-900/40 dark:bg-zinc-900 space-y-4 sm:space-y-6"
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
        <div
          ref={chatListRef}
          onScroll={handleChatScroll}
          className="max-h-[min(420px,50vh)] sm:max-h-[min(520px,55vh)] space-y-3 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]"
        >
          {copilotMessages.filter((m) => m.role !== "system").length === 0 && !copilotLoading && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
              Ask about your target market, pricing strategy, Mobile Money setup, or fundraising steps.
              Replies come as clear points plus a concrete next step.
            </div>
          )}

          {copilotMessages
            .filter((m) => m.role !== "system")
            .map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "rounded-tr-none bg-green-700 text-white"
                      : "rounded-tl-none border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/60"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <CopilotMarkdown content={msg.content} variant="assistant" />
                  ) : (
                    <CopilotMarkdown content={msg.content} variant="user" />
                  )}
                </div>
              </div>
            ))}

          {copilotLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:bg-zinc-800">
                <Loader2 className="size-4 animate-ping text-green-600" />
                Copilot is thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleAskCopilot} className="items-end flex gap-2 sm:gap-3">
          <textarea
            ref={chatInputRef}
            rows={1}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value)
              resizeChatInput(e.currentTarget)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder="Ask your copilot..."
            maxLength={4000}
            className="min-h-11 max-h-40 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={copilotLoading || !question.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white transition hover:bg-green-800 disabled:opacity-50 cursor-pointer"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        </form>
      </section>
    </div>
  )
}
