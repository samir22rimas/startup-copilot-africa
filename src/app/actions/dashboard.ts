"use server"

import { createProject, getProjects } from "@/src/features/business/services/project.service"
import { createStartup, getMyStartup } from "@/src/features/business/services/startup.service"
import { supabaseAdmin } from "@/src/lib/supabase/admin"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface DashboardTask {
  id: string
  title: string
  tag: string
  done: boolean
}

export interface DashboardRecommendation {
  title: string
  detail: string
}

export interface DashboardDocument {
  id: string
  title: string
  summary: string
  status: string
}

export interface DashboardQuickAction {
  label: string
  href: string
  description: string
}

export interface MarketingMetric {
  title: string
  value: number
  unit: string
  change: string
  trend: "up" | "down"
  color: string
  /** Always derived from app records — never live campaign analytics */
  source: "derived"
  footnote: string
}

export interface MarketingEventItem {
  id: string
  day: number
  label: string
  color: string
  content?: string
}

export interface MarketingUpcomingItem {
  id: string
  title: string
  type: string
  time: string
  iconName: "file" | "video" | "mail" | "sparkles"
  iconBg: string
  iconColor: string
  source: "tracked" | "derived"
}

export interface FocusIndicator {
  label: string
  value: number
  footnote: string
  source: "derived" | "tracked"
}

export interface MarketingOverview {
  kpis: MarketingMetric[]
  strategyItems: DashboardRecommendation[]
  generatedContent: string
  events: MarketingEventItem[]
  upcoming: MarketingUpcomingItem[]
}

export interface DashboardOverview {
  healthScore: number
  healthLabel: string
  healthFootnote: string
  focusIndicators: FocusIndicator[]
  weeklyFocus: import("@/src/lib/focus-plan").WeeklyFocusPlan | null
  recommendations: DashboardRecommendation[]
  documents: DashboardDocument[]
  quickActions: DashboardQuickAction[]
  marketing: MarketingOverview
  trackedMetrics: import("@/src/lib/data-truth").TrackedMetrics | null
}

function getHealthLabel(score: number) {
  if (score >= 80) return "Thriving"
  if (score >= 60) return "On track"
  if (score >= 40) return "Needs attention"
  return "Building foundation"
}

function calculateHealthScore(
  startup: any,
  project: any,
  tasks: DashboardTask[],
  documents: any[],
  insights: any[],
  tracked?: import("@/src/lib/data-truth").TrackedMetrics | null,
  weeklyFocus?: import("@/src/lib/focus-plan").WeeklyFocusPlan | null,
) {
  let score = 20

  if (startup?.onboarding_status === "completed") score += 15
  if (startup?.estimated_budget_cents && startup.estimated_budget_cents > 0) score += 8
  if (project?.description) score += 8
  if (project?.target_audience) score += 8
  if (tasks.length > 0) {
    const completedTasks = tasks.filter((task) => task.done).length
    score += Math.round((completedTasks / tasks.length) * 20)
  }
  if (documents.length > 0) score += 8
  if (insights.length > 0) score += 5

  // Bonus only when founder has logged real operating numbers
  if (tracked?.updatedAt) {
    if (tracked.monthlyRevenue > 0 || tracked.activeCustomers > 0) score += 8
    if (tracked.monthlyBurn > 0) score += 4
    if (tracked.visitorsThisMonth > 0) score += 4
  }

  if (weeklyFocus?.priorities?.length) {
    const done = weeklyFocus.priorities.filter((p) => p.done).length
    score += Math.round((done / weeklyFocus.priorities.length) * 10)
    if (weeklyFocus.checkIn?.completedAt) score += 5
  }

  return Math.min(100, Math.max(0, score))
}

function buildFocusIndicators(
  startup: any,
  project: any,
  tasks: DashboardTask[],
  tracked?: import("@/src/lib/data-truth").TrackedMetrics | null,
): FocusIndicator[] {
  const valueProp =
    (project?.description ? 40 : 0) +
    (project?.target_audience ? 40 : 0) +
    (startup?.industry ? 20 : 0)

  const completed = tasks.filter((t) => t.done).length
  const taskProgress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0

  let runwayScore = startup?.estimated_budget_cents > 0 ? 40 : 10
  let runwayFootnote = startup?.estimated_budget_cents > 0
    ? "Based on budget set in your startup profile"
    : "No budget set yet — update Settings"
  let runwaySource: "derived" | "tracked" = "derived"

  if (tracked?.updatedAt && tracked.monthlyBurn > 0) {
    runwaySource = "tracked"
    const net = Math.max(0, tracked.monthlyBurn - tracked.monthlyRevenue)
    if (net === 0 && tracked.monthlyRevenue > 0) {
      runwayScore = 90
      runwayFootnote = "Tracked: revenue covers burn this month"
    } else if (tracked.monthlyRevenue > 0) {
      runwayScore = 55
      runwayFootnote = `Tracked: net burn ${net} ${tracked.currency}/mo`
    } else {
      runwayScore = 30
      runwayFootnote = `Tracked burn ${tracked.monthlyBurn} ${tracked.currency}/mo — no revenue logged`
    }
  }

  return [
    {
      label: "Value proposition setup",
      value: Math.min(100, valueProp),
      footnote: "Derived from description, audience, and industry on file",
      source: "derived",
    },
    {
      label: "Milestone execution",
      value: taskProgress,
      footnote: `${completed}/${tasks.length || 0} milestones complete`,
      source: "derived",
    },
    {
      label: "Financial runway signal",
      value: runwayScore,
      footnote: runwayFootnote,
      source: runwaySource,
    },
  ]
}

function buildRecommendations(
  startup: any,
  project: any,
  tasks: DashboardTask[],
  documents: any[],
  insights: any[],
): DashboardRecommendation[] {
  if (insights.length > 0) {
    return insights.slice(0, 3).map((insight) => ({
      title: insight.title || insight.kind || "AI recommendation",
      detail: insight.result?.summary || insight.result?.next_step || insight.error_message || "Keep moving forward with this insight.",
    }))
  }

  const recommendations: DashboardRecommendation[] = []

  if (!project?.description) {
    recommendations.push({
      title: "Define your offer",
      detail: `Capture what ${startup?.name || "your startup"} solves and why it matters to the first customer.`,
    })
  }

  if (tasks.some((task) => !task.done)) {
    recommendations.push({
      title: "Complete the next milestone",
      detail: `You still have ${tasks.filter((task) => !task.done).length} open milestone${tasks.filter((task) => !task.done).length > 1 ? "s" : ""} to close this week.`,
    })
  }

  if (documents.length === 0) {
    recommendations.push({
      title: "Upload customer evidence",
      detail: `Add customer notes, interviews, or pricing feedback so the dashboard can reflect more of your real progress.`,
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Review your launch plan",
      detail: `Use the current project context to refine your offer, channels, and proof points.`,
    })
  }

  return recommendations
}

function buildDocuments(startup: any, project: any, documents: any[]): DashboardDocument[] {
  if (documents.length === 0) return []

  return documents.slice(0, 4).map((document) => ({
    id: document.id,
    title: document.file_name || "Uploaded document",
    summary:
      document.metadata?.summary ||
      (document.extracted_text
        ? String(document.extracted_text).slice(0, 120)
        : `Tracked upload for ${startup?.name || project?.title || "your startup"}`),
    status: document.status || "ready",
  }))
}

function buildQuickActions(startup: any, project: any): DashboardQuickAction[] {
  return [
    {
      label: "Upload knowledge documents",
      href: "/dashboard/documents",
      description: "Add briefs and research so Copilot uses your real files",
    },
    {
      label: "Open marketing workspace",
      href: "/dashboard/marketing",
      description: `Create launch content for ${project?.title || startup?.name || "your startup"}`,
    },
    {
      label: "Ask your copilot",
      href: "/dashboard#copilot",
      description: "Turn your latest progress into the next move",
    },
  ]
}

function buildMarketingOverview(
  startup: any,
  project: any,
  tasks: DashboardTask[],
  documents: any[],
  insights: any[],
  scheduledEvents: MarketingEventItem[] = [],
): MarketingOverview {
  const completedTasks = tasks.filter((task) => task.done).length
  const totalAssets = documents.length + insights.length
  const launchReadiness = Math.min(
    100,
    Math.round(35 + completedTasks * 8 + (documents.length > 0 ? 15 : 0) + (insights.length > 0 ? 10 : 0)),
  )
  const coverage = Math.min(100, Math.round(20 + documents.length * 15 + insights.length * 10))

  const kpis: MarketingMetric[] = [
    {
      title: "SAVED ASSETS",
      value: totalAssets,
      unit: " items",
      change: `${documents.length} docs · ${insights.length} insights`,
      trend: "up",
      color: "bg-green-100 text-green-700",
      source: "derived",
      footnote: "Count of documents and insights stored in this app — not live ad metrics",
    },
    {
      title: "LAUNCH READINESS",
      value: launchReadiness,
      unit: "%",
      change: `${completedTasks}/${tasks.length} tasks complete`,
      trend: "up",
      color: "bg-blue-100 text-blue-700",
      source: "derived",
      footnote: "Heuristic from milestone completion and saved assets — not market traction",
    },
    {
      title: "CONTEXT COVERAGE",
      value: coverage,
      unit: "%",
      change: `${insights.length} insights on file`,
      trend: insights.length > 0 ? "up" : "down",
      color: "bg-zinc-100 text-zinc-700",
      source: "derived",
      footnote: "How much launch context the AI can use — not campaign reach",
    },
  ]

  const strategyItems: DashboardRecommendation[] = []
  if (insights.length > 0) {
    insights.slice(0, 3).forEach((insight) => {
      strategyItems.push({
        title: insight.title || insight.kind || "Marketing insight",
        detail:
          insight.result?.summary ||
          insight.result?.next_step ||
          insight.error_message ||
          "Keep the launch momentum moving.",
      })
    })
  }

  if (strategyItems.length === 0) {
    strategyItems.push({
      title: "Shape the story around your first customer",
      detail: `Use the latest project context for ${project?.title || startup?.name || "your startup"} to sharpen the offer and message.`,
    })
  }

  const generatedContent = [project?.title || startup?.name || "Your startup", documents[0]?.file_name || null, insights[0]?.title || null]
    .filter(Boolean)
    .join(" • ")

  // Calendar only shows founder-scheduled posts — never invents events from documents
  const events: MarketingEventItem[] = scheduledEvents

  const upcoming: MarketingUpcomingItem[] = scheduledEvents
    .slice()
    .sort((a, b) => a.day - b.day)
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      title: event.label,
      type: "Scheduled",
      time: `Day ${event.day}`,
      iconName: "mail" as const,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-700 dark:text-green-400",
      source: "tracked" as const,
    }))

  if (upcoming.length === 0 && documents.length > 0) {
    documents.slice(0, 2).forEach((document, index) => {
      upcoming.push({
        id: `upcoming-doc-${document.id}`,
        title: document.file_name || "Launch document",
        type: "On file",
        time: "Not scheduled",
        iconName: index === 0 ? "file" : "video",
        iconBg: index === 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-pink-100 dark:bg-pink-900/30",
        iconColor: index === 0 ? "text-blue-600 dark:text-blue-400" : "text-pink-600 dark:text-pink-400",
        source: "derived",
      })
    })
  }

  return {
    kpis,
    strategyItems,
    generatedContent:
      generatedContent ||
      `Your latest launch content will appear here once you store documents or insights for ${startup?.name || project?.title || "your startup"}.`,
    events,
    upcoming,
  }
}

/**
 * Gets all dashboard data for the active startup/project.
 */
export async function getDashboardData() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { error: "Not authenticated" }
  }

  // 1. Fetch startup
  const startup = await getMyStartup()
  if (!startup) {
    return { hasStartup: false }
  }

  // 2. Fetch projects
  const projects = await getProjects(startup.id)
  if (projects.length === 0) {
    return { hasStartup: true, hasProject: false, startup }
  }

  const { readActiveProjectCookie, resolveActiveProject, writeActiveProjectCookie } = await import(
    "@/src/lib/active-project"
  )
  const preferredId = await readActiveProjectCookie()
  const project = resolveActiveProject(projects, preferredId)

  // Keep cookie aligned when falling back to newest project
  if (preferredId !== project.id) {
    try {
      await writeActiveProjectCookie(project.id)
    } catch {
      // Cookie writes can fail in some RSC contexts; selection still works for this request
    }
  }

  // 3. Extract tasks from project metadata
  const metadata = (project.metadata as any) || {}
  let tasks: DashboardTask[] = metadata.tasks || []

  // If no tasks exist, initialize defaults
  if (tasks.length === 0) {
    const systemPrompt = `You are a Startup Advisor for an African founder.
Based on the startup details, generate exactly 4 actionable, highly specific tasks for their initial launch dashboard.
Return ONLY valid JSON matching this exact structure:
[
  { "id": "task_1", "title": "...", "tag": "Research", "done": false },
  ... exactly 4 tasks
]
Tags should be one of: Research, Strategy, Planning, Infrastructure, Marketing.
Context:
Startup: ${startup.name}
Location: ${startup.city || "Unknown"}, ${startup.country_code || "Africa"}
Budget: ${(startup.estimated_budget_cents || 0) / 100} ${startup.budget_currency || "USD"}
Project: ${project.title}
Description: ${project.description || "N/A"}`

    try {
      const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
      const response = await generateTextWithFallback(systemPrompt, [], { maxTokens: 800, temperature: 0.6 })
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0])
      }
    } catch (error: any) {
      console.error("Failed to generate initial tasks with AI", error)
      tasks = [
        { id: "error", title: `Failed to generate personalized tasks. Check your AI provider configuration. Error: ${error.message || "Unknown"}`, tag: "Error", done: false }
      ]
    }

    if (tasks.length === 0) {
      tasks = [
        { id: "error", title: "The AI returned an empty task list. Please refresh or try again.", tag: "Error", done: false }
      ]
    }

    // Save defaults to metadata
    await supabase
      .from("projects")
      .update({
        metadata: { ...metadata, tasks }
      })
      .eq("id", project.id)
  }

  // 4. Fetch or auto-create the active Copilot conversation/messages
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", project.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })

  let copilotMessages: any[] = []
  let conversationId = conversations?.[0]?.id || ""

  if (!conversationId) {
    // Auto-create a conversation for dashboard copilot
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        startup_id: startup.id,
        project_id: project.id,
        created_by: user.id,
        title: `Dashboard Copilot: ${project.title}`,
      })
      .select("id")
      .single()

    if (newConv) {
      conversationId = newConv.id
    }
  }

  if (conversationId) {
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
    copilotMessages = messages || []
  }

  const { data: documents = [] } = await supabase
    .from("knowledge_documents")
    .select("id, file_name, status, metadata, created_at")
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false })
    .limit(4)

  const { data: insights = [] } = await supabase
    .from("insights")
    .select("id, title, kind, status, result, error_message, created_at")
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false })
    .limit(4)

  const metadataBag =
    project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : {}

  const { readTrackedMetrics, readMarketingWorkspace, hasTrackedMetrics } = await import("@/src/lib/data-truth")
  const { ensureWeeklyFocusPlan } = await import("@/src/app/actions/focus-plan")

  const trackedMetricsRaw = readTrackedMetrics(metadataBag, startup.budget_currency || "USD")
  const trackedMetrics = hasTrackedMetrics(trackedMetricsRaw) ? trackedMetricsRaw : null
  const marketingWorkspace = readMarketingWorkspace(metadataBag)
  const weeklyFocus = await ensureWeeklyFocusPlan(project.id)

  const healthScore = calculateHealthScore(
    startup,
    project,
    tasks,
    documents || [],
    insights || [],
    trackedMetrics,
    weeklyFocus,
  )

  const overview: DashboardOverview = {
    healthScore,
    healthLabel: getHealthLabel(healthScore),
    healthFootnote: trackedMetrics
      ? "Score blends onboarding progress, milestones, and your tracked operating metrics"
      : "Score is derived from onboarding, milestones, and saved assets — log tracked metrics in Analytics to improve accuracy",
    focusIndicators: buildFocusIndicators(startup, project, tasks, trackedMetrics),
    weeklyFocus,
    recommendations: buildRecommendations(startup, project, tasks, documents || [], insights || []),
    documents: buildDocuments(startup, project, documents || []),
    quickActions: buildQuickActions(startup, project),
    marketing: buildMarketingOverview(
      startup,
      project,
      tasks,
      documents || [],
      insights || [],
      marketingWorkspace.events,
    ),
    trackedMetrics,
  }

  return {
    hasStartup: true,
    hasProject: true,
    startup,
    project,
    projects,
    tasks,
    conversationId,
    copilotMessages,
    overview,
  }
}

/**
 * Creates startup and associated project in a single transaction-like flow.
 */
export async function createStartupAndFirstProject(input: {
  name: string
  countryCode: string
  city: string
  industry: string
  estimatedBudgetCents: number
  budgetCurrency: string
  projectTitle: string
  projectDescription: string
}) {
  try {
    const { startup, error: startupError } = await createStartup({
      name: input.name,
      country_code: input.countryCode,
      city: input.city,
      industry: input.industry,
      estimated_budget_cents: input.estimatedBudgetCents,
      budget_currency: input.budgetCurrency,
    })

    if (startupError || !startup) {
      return { success: false as const, error: startupError ?? "Failed to create startup record." }
    }

    const project = await createProject({
      startup_id: startup.id,
      title: input.projectTitle,
      description: input.projectDescription,
    })

    if (!project) {
      return { success: false as const, error: "Startup created, but the project failed to save." }
    }

    const { writeActiveProjectCookie } = await import("@/src/lib/active-project")
    try {
      await writeActiveProjectCookie(project.id)
    } catch {
      // non-blocking
    }

    revalidatePath("/dashboard", "layout")
    return { success: true as const, startup, project }
  } catch (err: any) {
    console.error("Error in createStartupAndFirstProject:", err)
    return { success: false as const, error: err.message || "An unexpected error occurred." }
  }
}

/**
 * Toggles a dashboard task status.
 */
export async function toggleDashboardTask(projectId: string, taskId: string, done: boolean) {
  const supabase = await createSupabaseServerClient()

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single()

  if (!project) return false

  const metadata = (project.metadata as any) || {}
  const tasks: DashboardTask[] = metadata.tasks || []

  const updatedTasks = tasks.map(task =>
    task.id === taskId ? { ...task, done } : task
  )

  const { error } = await supabase
    .from("projects")
    .update({
      metadata: { ...metadata, tasks: updatedTasks }
    })
    .eq("id", projectId)

  if (error) {
    console.error("Failed to toggle task:", error.message)
    return false
  }

  revalidatePath("/dashboard")
  return true
}

/**
 * Adds a new custom dashboard task.
 */
export async function addDashboardTask(projectId: string, title: string, tag: string) {
  const supabase = await createSupabaseServerClient()

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single()

  if (!project) return false

  const metadata = (project.metadata as any) || {}
  const tasks: DashboardTask[] = metadata.tasks || []

  const newTask: DashboardTask = {
    id: `task-${Date.now()}`,
    title,
    tag,
    done: false
  }

  const updatedTasks = [...tasks, newTask]

  const { error } = await supabase
    .from("projects")
    .update({
      metadata: { ...metadata, tasks: updatedTasks }
    })
    .eq("id", projectId)

  if (error) {
    console.error("Failed to add task:", error.message)
    return false
  }

  revalidatePath("/dashboard")
  return true
}

/**
 * Sends a chat message to the copilot and stores both user prompt and assistant response.
 */
export async function sendStatefulCopilotMessage(
  projectId: string,
  conversationId: string,
  messageText: string
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("You must be signed in.")
  }

  // 1. Insert user message
  const { error: userMsgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      author_id: user.id,
      role: "user",
      content: messageText,
    })

  if (userMsgErr) {
    console.error("Error inserting user message:", userMsgErr.message)
    throw new Error("Failed to save message.")
  }

  // 2. Fetch project/startup context
  const { data: project } = await supabase
    .from("projects")
    .select("startup_id, title, description")
    .eq("id", projectId)
    .single()

  if (!project || !project.startup_id) {
    throw new Error("Associated project not found.")
  }

  const { data: startup } = await supabase
    .from("startups")
    .select("*")
    .eq("id", project.startup_id)
    .single()

  // 3. Fetch entire conversation messages
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  const { getDocumentContextForStartup } = await import("@/src/app/actions/documents")
  const documentContext = await getDocumentContextForStartup(project.startup_id)

  const systemContext = `You are Startup Copilot, an expert AI advisor for early-stage African startup founders.
You provide actionable, context-aware advice on product development, fundraising, marketing, and operations.
Keep responses concise and practical.
Prefer facts from founder-uploaded documents when they conflict with assumptions.
Current startup context:
- Name: ${startup?.name}
- Industry: ${startup?.industry || "N/A"}
- Description: ${project?.description || startup?.description || "N/A"}
- Location: ${startup?.city || "N/A"}, ${startup?.country_code}
- Budget: ${(startup?.estimated_budget_cents || 0) / 100} ${startup?.budget_currency || "USD"}

Founder-uploaded documents (tracked knowledge):
${documentContext}`

  const formattedMessages = (messages || []).map(m => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content
  }))

  // 4. Request response from the available AI provider
  const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
  const reply = await generateTextWithFallback(systemContext, formattedMessages)

  // 5. Insert assistant response (must use service-role client — RLS only allows
  //    role='user' inserts for regular users; assistant messages are server-only)
  await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
    })

  revalidatePath("/dashboard")
  return reply
}

